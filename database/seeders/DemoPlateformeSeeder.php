<?php

namespace Database\Seeders;

use App\Enums\CodeExamen;
use App\Enums\CodeSerie;
use App\Enums\FormuleAbonnement;
use App\Enums\MoyenPaiement;
use App\Enums\Role;
use App\Enums\SourceAbonnement;
use App\Enums\StatutPaiement;
use App\Models\Abonnement;
use App\Models\CodeAcces;
use App\Models\Etablissement;
use App\Models\Examen;
use App\Models\ExamenBlanc;
use App\Models\LotCodes;
use App\Models\Paiement;
use App\Models\ProfilEleve;
use App\Models\ReleveJauge;
use App\Models\Serie;
use App\Models\Sujet;
use App\Models\User;
use App\Services\CodeAccesService;
use App\Services\Plateforme\ReleveJaugeService;
use App\Services\ProfilEleveService;
use App\Support\HorlogeDemo;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Lot 13 : une cohorte **fictive** pour que la console plateforme ait la
 * forme qu'elle aura en service (CLAUDE.md § 3 bis : « sans données, il
 * garde sa forme avec des données d'exemple marquées »). Soixante élèves
 * (40 BEPC, 20 Bac SE ; la moitié des BEPC au collège de démonstration),
 * douze semaines d'activité, de séances, de relevés de jauge, d'examens
 * blancs et de paiements simulés. Les assidus progressent plus vite que les
 * autres : c'est un scénario de démonstration, pas une mesure.
 *
 * Tout est marqué : `profils_eleves.est_exemple`, abonnements
 * `est_exemple`, passerelle `simulee` ; la console affiche le bandeau
 * « EXEMPLE — contenu fictif ». Aucun mot de passe utilisable. Les valeurs
 * sont tirées d'un générateur à graine fixe : le même semis donne les
 * mêmes chiffres (captures stables).
 *
 * Idempotent : si la cohorte existe, rien n'est refait.
 */
class DemoPlateformeSeeder extends Seeder
{
    public const NOMBRE = 60;

    public const PREFIXE_PSEUDO = 'cohorte_';

    private const PRENOMS = [
        'Aminata', 'Mamadou', 'Kadiatou', 'Ibrahima', 'Fatoumata', 'Alpha', 'Mariama', 'Ousmane', 'Hadja', 'Sékou',
        'Aïssata', 'Boubacar', 'Djénabou', 'Lansana', 'Nènè', 'Abdoulaye', 'Oumou', 'Mohamed', 'Saran', 'Thierno',
        'Kadiatou', 'Moussa', 'Fanta', 'Amadou', 'Hawa', 'Souleymane', 'Bintou', 'Mamadi', 'Rouguiatou', 'Elhadj',
    ];

    private int $graine = 13;

    private CarbonImmutable $maintenant;

    private CodeAccesService $codes;

    /** Le premier code du lot de démonstration est celui d'Ousmane (DemoAbonnementsSeeder). */
    private int $codesUtilises = 1;

    public function run(ProfilEleveService $profils, ReleveJaugeService $releves, CodeAccesService $codes): void
    {
        $this->codes = $codes;
        if (app()->isProduction()) {
            throw new RuntimeException('Les données de démonstration ne sont jamais créées en production.');
        }

        // Les élèves de démonstration des lots précédents sont fictifs aussi.
        ProfilEleve::query()->whereHas('user', fn ($q) => $q->whereIn('telephone', [
            ...array_column(DemoSeeder::COMPTES, 'telephone'),
            ...array_column(DemoOrganisationSeeder::ELEVES_EXEMPLE, 'telephone'),
        ]))->update(['est_exemple' => true]);

        if (User::query()->where('pseudo', self::PREFIXE_PSEUDO.'01')->exists()) {
            return;
        }

        // L'instant du semis (HorlogeDemo) : relancé sur une démonstration
        // existante, ce seeder se place au même moment que les autres.
        $maintenant = HorlogeDemo::instant() ?? CarbonImmutable::now();
        $this->maintenant = $maintenant;
        $semaineCourante = ReleveJaugeService::semaine($maintenant);

        // Les élèves des lots précédents : le relevé de la semaine passée, par
        // le vrai service (avant la cohorte, qui a ses relevés de scénario).
        $releves->relever($semaineCourante->subWeek());
        $bepc = Examen::query()->where('code', CodeExamen::Bepc)->firstOrFail();
        $bac = Examen::query()->where('code', CodeExamen::Bac)->firstOrFail();
        $serieSe = Serie::query()->where('examen_id', $bac->id)->where('code', CodeSerie::Se)->firstOrFail();
        $college = Etablissement::query()->where('nom', DemoOrganisationSeeder::ETABLISSEMENT)->value('id');
        $sujets = [
            $bepc->id => Sujet::query()->where('examen_id', $bepc->id)->whereNotNull('version_publiee_id')->orderBy('id')->first(),
            $bac->id => Sujet::query()->where('examen_id', $bac->id)->whereNotNull('version_publiee_id')->orderBy('id')->first(),
        ];

        $motDePasse = bcrypt(Str::random(40));
        $paiements = 0;

        for ($i = 1; $i <= self::NOMBRE; $i++) {
            $estBac = $i > 40;
            $assidu = $i % 5 < 2;
            $numero = str_pad((string) $i, 2, '0', STR_PAD_LEFT);
            $user = User::query()->forceCreate([
                'prenom' => self::PRENOMS[($i - 1) % count(self::PRENOMS)],
                'pseudo' => self::PREFIXE_PSEUDO.$numero,
                'telephone' => '+224600000'.str_pad((string) (200 + $i), 3, '0', STR_PAD_LEFT),
                'password' => $motDePasse,
            ]);
            $user->syncRoles([Role::Eleve->value]);

            $examen = $estBac ? $bac : $bepc;
            $profil = $profils->enregistrer($user, $examen->id, $estBac ? $serieSe->id : null, ! $estBac && $i % 2 === 0 ? $college : null, 15);

            // Près de la moitié des autres élèves décrochent : un tiers dès les
            // premières semaines, d'autres au bout d'un mois environ.
            $decroche = match (true) {
                $assidu => null,
                $i % 3 === 1 => $this->entre(0, 1),
                $i % 3 === 2 && $i % 2 === 1 => $this->entre(2, 5),
                default => null,
            };

            // Inscription : la plupart avant la période, quelques-uns en cours
            // de route ; celui qui décroche vite s'est inscrit juste avant.
            $semainesAvant = match (true) {
                $i % 9 === 0 => $this->entre(2, 6),
                $decroche !== null => 12,
                default => $this->entre(12, 15),
            };
            $inscrit = $semaineCourante->subWeeks($semainesAvant)->addDays($decroche !== null ? 6 : $this->entre(0, 4))->setTime(18, 30);
            $profil->forceFill(['est_exemple' => true, 'created_at' => $inscrit, 'updated_at' => $inscrit])->save();
            $user->forceFill(['created_at' => $inscrit, 'telephone_verifie_le' => $inscrit])->save();
            $jauge = $assidu ? $this->entre(24, 38) : $this->entre(20, 34);
            $pente = $assidu ? $this->entre(14, 22) / 10 : $this->entre(2, 8) / 10;
            $seances = [];
            $jours = [];
            $releveLignes = [];

            for ($recul = min(11, $semainesAvant - 1); $recul >= 0; $recul--) {
                $semaine = $semaineCourante->subWeeks($recul);
                $rang = 11 - $recul;

                if ($decroche !== null && $rang - (12 - min(12, $semainesAvant)) > $decroche) {
                    continue;
                }

                $nombre = $assidu ? ($this->entre(1, 10) === 1 ? 2 : $this->entre(3, 5)) : $this->entre(0, 2);
                $joursSemaine = $recul === 0 ? max(1, $maintenant->dayOfWeekIso - 1) : 7;

                for ($s = 0; $s < $nombre; $s++) {
                    $jour = $semaine->addDays(min($joursSemaine - 1, intdiv($s * 7, max(1, $nombre)) + $this->entre(0, 1)));
                    if ($jour->greaterThan($maintenant)) {
                        continue;
                    }
                    $fin = $jour->setTime(19, $this->entre(5, 50));
                    $seances[] = [
                        'uuid' => (string) Str::uuid7(),
                        'user_id' => $user->id,
                        'jour' => $jour->toDateString(),
                        'questions' => '[]',
                        'duree_minutes' => 15,
                        'genere_le' => $jour->setTime(6, 0),
                        'termine_le' => $fin,
                        'created_at' => $jour->setTime(6, 0),
                        'updated_at' => $fin,
                    ];
                    $jours[$jour->toDateString()] = ($jours[$jour->toDateString()] ?? 0) + $this->entre(8, 14);
                }

                if ($nombre === 0 && $this->entre(1, 3) === 1 && $semaine->addDays(2)->lessThanOrEqualTo($maintenant)) {
                    $jours[$semaine->addDays(2)->toDateString()] = $this->entre(2, 6);
                }

                // Le relevé du dimanche (la semaine en cours n'est pas encore relevée).
                if ($recul > 0) {
                    $jauge = min(92, $jauge + $pente + $this->entre(-6, 6) / 10);
                    $releveLignes[] = [
                        'user_id' => $user->id,
                        'semaine' => $semaine->toDateString(),
                        'pourcentage' => (int) round($jauge),
                        'examen_id' => $examen->id,
                        'serie_id' => $estBac ? $serieSe->id : null,
                        'etablissement_id' => $profil->etablissement_id,
                        'created_at' => $semaine->addDays(6)->setTime(22, 0),
                        'updated_at' => $semaine->addDays(6)->setTime(22, 0),
                    ];
                }
            }

            // Quelques-uns ont déjà répondu ce matin, avant l'école.
            if ($decroche === null && $i % 3 === 0) {
                $jours[$maintenant->toDateString()] = ($jours[$maintenant->toDateString()] ?? 0) + $this->entre(4, 9);
            }

            DB::table('seances')->insert($seances);
            DB::table('series_jours')->insert(array_map(fn (string $jour, int $reponses) => [
                'user_id' => $user->id,
                'jour' => $jour,
                'reponses' => $reponses,
                'secondes' => $reponses * 70,
                'objectif_atteint' => $reponses >= 10,
                'created_at' => $jour.' 19:30:00',
                'updated_at' => $jour.' 19:30:00',
            ], array_keys($jours), array_values($jours)));
            ReleveJauge::query()->insert($releveLignes);

            $this->examensBlancs($user, $sujets[$examen->id], $assidu, $semaineCourante, $semainesAvant, $decroche);
            $paiements += $this->abonnement($user, $i, $assidu, $semaineCourante, $maintenant);
        }

    }

    private function examensBlancs(User $user, ?Sujet $sujet, bool $assidu, CarbonImmutable $semaineCourante, int $semainesAvant, ?int $decroche): void
    {
        if ($sujet === null || (! $assidu && $this->entre(1, 2) === 1)) {
            return;
        }

        $nombre = $assidu ? $this->entre(2, 3) : 2;
        $note = $assidu ? $this->entre(80, 110) / 10 : $this->entre(75, 105) / 10;
        $gain = $assidu ? $this->entre(10, 18) / 10 : $this->entre(0, 8) / 10;
        $premiere = max(1, 11 - min(11, $semainesAvant - 1)) + 1;
        $derniere = $decroche === null ? 11 : 12 - min(12, $semainesAvant) + $decroche;

        if ($derniere - $premiere < 2) {
            return;
        }

        for ($e = 0; $e < $nombre; $e++) {
            $rang = (int) round($premiere + ($derniere - $premiere) * $e / max(1, $nombre - 1));
            $debut = $semaineCourante->subWeeks(11 - $rang)->addDays(5)->setTime(9, 0);

            if ($debut->greaterThan($this->maintenant)) {
                $debut = $this->maintenant->subDay()->setTime(9, 0);
            }

            ExamenBlanc::query()->create([
                'uuid' => (string) Str::uuid7(),
                'user_id' => $user->id,
                'sujet_id' => $sujet->id,
                'version' => 1,
                'mode' => 'conditions_reelles',
                'duree_minutes' => 120,
                'origine_duree' => 'choisie',
                'commence_le' => $debut,
                'termine_le' => $debut->addMinutes(100),
                'temps_ecoule' => false,
                'note_sur_20' => min(19.5, $note + $gain * $e + $this->entre(-4, 4) / 10),
                'details' => ['exemple' => true],
                'horloge_suspecte' => false,
                'recu_le' => $debut->addMinutes(101),
            ]);
        }
    }

    /**
     * Un élève sur trois paie (mobile money, simulé) ; un sur dix échoue
     * d'abord. Renvoie le nombre de paiements réussis.
     */
    private function abonnement(User $user, int $i, bool $assidu, CarbonImmutable $semaineCourante, CarbonImmutable $maintenant): int
    {
        if ($i % 3 !== 0 && ! ($assidu && $i % 2 === 0)) {
            $this->codePrepaye($user, $i, $semaineCourante);

            return 0;
        }

        $formule = $i % 7 === 0 ? FormuleAbonnement::Annee : FormuleAbonnement::Mensuel;
        $moyen = $i % 2 === 0 ? MoyenPaiement::OrangeMoney : MoyenPaiement::MtnMomo;
        $le = $semaineCourante->subWeeks($this->entre(0, 11))->addDays($this->entre(0, 5))->setTime(20, 15);
        $le = $le->greaterThan($maintenant) ? $maintenant->subHours(3) : $le;

        if ($i % 10 === 0) {
            $this->paiement($user, $formule, $moyen, StatutPaiement::Echoue, $le->subDay(), 'Solde insuffisant.');
        }

        $paiement = $this->paiement($user, $formule, $moyen, StatutPaiement::Reussi, $le);
        Abonnement::query()->create([
            'user_id' => $user->id,
            'formule' => $formule->value,
            'debut' => $le,
            'fin' => $le->addMonthsNoOverflow($formule->mois()),
            'source' => SourceAbonnement::Paiement->value,
            'paiement_id' => $paiement->id,
            'est_exemple' => true,
        ]);

        return 1;
    }

    /**
     * Un élève sur sept parmi ceux qui ne paient pas par mobile money a
     * acheté un code chez le revendeur de démonstration : il passe par le
     * vrai service, puis la date est reculée dans les douze semaines.
     */
    private function codePrepaye(User $user, int $i, CarbonImmutable $semaineCourante): void
    {
        $lot = LotCodes::query()->where('libelle', DemoAbonnementsSeeder::LOT)->first();

        if ($i % 7 !== 3 || $lot === null || $lot->codes_en_attente === null || ! isset($lot->codes_en_attente[$this->codesUtilises])) {
            return;
        }

        $abonnement = $this->codes->utiliser($user, $lot->codes_en_attente[$this->codesUtilises]);
        $this->codesUtilises++;
        $le = $semaineCourante->subWeeks($this->entre(0, 10))->addDays($this->entre(0, 4))->setTime(17, 0);
        $le = $le->greaterThan($this->maintenant) ? $this->maintenant->subHours(5) : $le;

        CodeAcces::query()->whereKey($abonnement->code_acces_id)->update(['utilise_le' => $le]);
        $abonnement->forceFill(['debut' => $le, 'fin' => $le->addMonthsNoOverflow($lot->formule->mois()), 'est_exemple' => true])->save();
    }

    private function paiement(User $eleve, FormuleAbonnement $formule, MoyenPaiement $moyen, StatutPaiement $statut, CarbonImmutable $le, ?string $motif = null): Paiement
    {
        return Paiement::create([
            'uuid' => (string) Str::uuid7(),
            'user_id' => $eleve->id,
            'formule' => $formule->value,
            'montant_gnf' => $formule->prixGnf(),
            'moyen' => $moyen->value,
            'passerelle' => 'simulee',
            'numero_payeur' => '+224622000042',
            'numero_fin' => '42',
            'reference_operateur' => 'SIM-COHORTE-'.Str::upper(Str::random(10)),
            'statut' => $statut->value,
            'motif_echec' => $motif,
            'initie_le' => $le,
            'conclu_le' => $le->addMinute(),
            'expire_le' => $le->addMinutes(30),
        ]);
    }

    /** Un entier entre deux bornes, d'un générateur à graine fixe (congruentiel). */
    private function entre(int $min, int $max): int
    {
        $this->graine = ($this->graine * 1103515245 + 12345) % 2147483648;

        return $min + $this->graine % ($max - $min + 1);
    }
}
