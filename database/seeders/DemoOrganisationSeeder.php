<?php

namespace Database\Seeders;

use App\Enums\CodeExamen;
use App\Enums\Filiere;
use App\Enums\Role;
use App\Enums\TypeEtablissement;
use App\Enums\TypeQuestion;
use App\Models\Classe;
use App\Models\Devoir;
use App\Models\Etablissement;
use App\Models\Examen;
use App\Models\Groupe;
use App\Models\LicenceEtablissement;
use App\Models\LienParent;
use App\Models\MembreGroupe;
use App\Models\Question;
use App\Models\RattachementEtablissement;
use App\Models\Seance;
use App\Models\User;
use App\Services\AbonnementService;
use App\Services\Organisation\DevoirService;
use App\Services\ProfilEleveService;
use App\Services\SeanceService;
use App\Services\TentativeService;
use App\Support\CatalogueEleve;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Lot 11 (développement seulement) : de quoi voir les espaces parent,
 * enseignant et établissement **pleins**, tout marqué `est_exemple`.
 *
 *  - le **Collège exemple de Ratoma**, géré par Mariama (07), où enseigne
 *    Fatoumata (03), avec une licence de 40 places ;
 *  - son groupe **10e A** (BEPC, code KAFE47) : Aïssatou (01) et cinq
 *    élèves d'exemple (`ELEVES_EXEMPLE`, sans mot de passe utilisable) qui
 *    ont répondu à de vraies questions par les vrais services — d'où des
 *    notions faibles honnêtes ;
 *  - deux devoirs : l'un échu, rendu par trois élèves ; l'autre à rendre ;
 *  - Mamadou (02) suit Aïssatou.
 *
 * Idempotent : si le groupe existe, rien n'est refait.
 */
class DemoOrganisationSeeder extends Seeder
{
    public const ETABLISSEMENT = 'Collège exemple de Ratoma';

    public const CODE_GROUPE = 'KAFE47';

    /**
     * Élèves d'exemple du groupe : prénom, et la part de bonnes réponses
     * (sur trois questions, combien de justes).
     *
     * @var list<array{telephone: string, prenom: string, pseudo: string, justes: int}>
     */
    public const ELEVES_EXEMPLE = [
        ['telephone' => '+224600000101', 'prenom' => 'Fanta', 'pseudo' => 'exemple_fanta', 'justes' => 3],
        ['telephone' => '+224600000102', 'prenom' => 'Thierno', 'pseudo' => 'exemple_thierno', 'justes' => 1],
        ['telephone' => '+224600000103', 'prenom' => 'Mariam', 'pseudo' => 'exemple_mariam', 'justes' => 2],
        ['telephone' => '+224600000104', 'prenom' => 'Sâa', 'pseudo' => 'exemple_saa', 'justes' => 0],
        ['telephone' => '+224600000105', 'prenom' => 'Hawa', 'pseudo' => 'exemple_hawa', 'justes' => 2],
    ];

    public function run(ProfilEleveService $profils, TentativeService $tentatives, DevoirService $devoirs, SeanceService $seances, AbonnementService $abonnements): void
    {
        if (app()->isProduction()) {
            throw new RuntimeException('Les données de démonstration ne sont jamais créées en production.');
        }

        if (Groupe::query()->where('code', self::CODE_GROUPE)->exists()) {
            return;
        }

        $compte = fn (string $telephone) => User::query()->where('telephone', $telephone)->firstOrFail();
        $aissatou = $compte('+224600000001');
        $mamadou = $compte('+224600000002');
        $fatoumata = $compte('+224600000003');
        $mariama = $compte('+224600000007');
        $bepc = Examen::query()->where('code', CodeExamen::Bepc)->sole();
        $maintenant = CarbonImmutable::now();

        $etablissement = Etablissement::query()->firstOrCreate(['nom' => self::ETABLISSEMENT], [
            'type' => TypeEtablissement::Prive->value,
            'commune' => 'Ratoma',
            'prefecture' => 'Conakry',
            'region' => 'Conakry',
            'est_exemple' => true,
        ]);

        foreach ([[$mariama, Role::GestionnaireEtablissement], [$fatoumata, Role::Enseignant]] as [$user, $role]) {
            RattachementEtablissement::query()->updateOrCreate(
                ['user_id' => $user->id, 'etablissement_id' => $etablissement->id],
                ['role' => $role->value, 'rattache_le' => $maintenant->subMonths(2), 'retire_le' => null],
            );
        }

        $licence = LicenceEtablissement::create([
            'etablissement_id' => $etablissement->id,
            'places' => 40,
            'debut' => $maintenant->subMonths(2)->startOfDay(),
            'fin' => $maintenant->addMonths(7)->endOfDay(),
            'reference' => 'Contrat d’exemple',
            'cree_par' => $compte('+224600000008')->id,
            'est_exemple' => true,
        ]);

        $groupe = Groupe::create([
            'enseignant_id' => $fatoumata->id,
            'etablissement_id' => $etablissement->id,
            'examen_id' => $bepc->id,
            'serie_id' => null,
            'filiere' => Filiere::Generale->value,
            'classe_id' => Classe::query()->where('examen_id', $bepc->id)->orderBy('ordre')->value('id'),
            'nom' => '10e A',
            'code' => self::CODE_GROUPE,
            'est_exemple' => true,
        ]);

        // Les élèves d'exemple : profil BEPC, réponses par TentativeService.
        $eleves = collect(self::ELEVES_EXEMPLE)->map(function (array $e) use ($profils) {
            $user = User::query()->firstOrCreate(['telephone' => $e['telephone']], [
                'prenom' => $e['prenom'],
                'pseudo' => $e['pseudo'],
                'password' => Str::random(40),
            ]);
            $user->syncRoles([Role::Eleve->value]);

            if ($user->profilEleve()->doesntExist()) {
                $profils->enregistrer($user, Examen::query()->where('code', CodeExamen::Bepc)->value('id'), null, null, 15);
            }

            return [$user, $e['justes']];
        });

        foreach ([$aissatou, ...$eleves->map(fn (array $paire) => $paire[0])->all()] as $rang => $eleve) {
            MembreGroupe::query()->updateOrCreate(
                ['groupe_id' => $groupe->id, 'eleve_id' => $eleve->id],
                ['rejoint_le' => $maintenant->subDays(20 - $rang), 'quitte_le' => null],
            );
        }

        $questions = CatalogueEleve::questions($groupe->profilType())
            ->with('versionPubliee')
            ->where('type', TypeQuestion::QcmUne->value)
            ->orderBy('notion_id')
            ->orderBy('id')
            ->get();

        foreach ($eleves as $indice => [$eleve, $justes]) {
            // Trois soirs : la notion de chacun change, la justesse aussi.
            foreach ($questions->slice($indice % 3, 6)->values() as $rang => $question) {
                $saisiLe = $maintenant->subDays(5 - intdiv($rang, 2) + ($indice % 2))->setTime(19, 5 + $rang * 3);
                $this->repondre($tentatives, $eleve, $question, $rang % 3 < $justes, $saisiLe);
            }
        }

        // Deux élèves d'exemple ont une place de la licence.
        foreach ($eleves->take(2) as [$eleve]) {
            $abonnements->activerLicence($eleve, $licence);
        }

        // Un devoir échu, rendu par trois élèves ; un autre à rendre.
        $pythagore = $questions->filter(fn (Question $q) => $q->notion_id === $questions->first()?->notion_id)->take(4)->values();
        $echu = $this->devoir($groupe, $fatoumata, 'Le théorème de Pythagore', 'Quatre questions, sans calculatrice.', $maintenant->subDays(2), $pythagore, $maintenant->subDays(9));
        $melange = $questions->unique('notion_id')->take(5)->values();
        $this->devoir($groupe, $fatoumata, 'Révision avant le contrôle', 'Une question par notion vue ce mois-ci.', $maintenant->addDays(5)->endOfDay(), $melange, $maintenant->subDay());

        foreach ($eleves->take(3) as $indice => [$eleve, $justes]) {
            $seance = $devoirs->commencer($eleve, $echu);
            $quand = $maintenant->subDays(4 - $indice)->setTime(18, 30);
            $seance->update(['jour' => $quand->toDateString()]);

            foreach ($pythagore as $rang => $question) {
                $this->repondre($tentatives, $eleve, $question, $rang < $justes + 1, $quand->addMinutes(2 * $rang), $seance);
            }

            $seances->terminer($eleve, $seance, $quand->addMinutes(12));
        }

        LienParent::query()->updateOrCreate(
            ['parent_id' => $mamadou->id, 'eleve_id' => $aissatou->id],
            ['lie_le' => $maintenant->subWeeks(3), 'revoque_le' => null],
        );
    }

    /** @param  Collection<int, Question>  $questions */
    private function devoir(Groupe $groupe, User $auteur, string $titre, string $consigne, CarbonImmutable $echeance, Collection $questions, CarbonImmutable $publieLe): Devoir
    {
        $devoir = Devoir::create([
            'groupe_id' => $groupe->id,
            'auteur_id' => $auteur->id,
            'titre' => $titre,
            'consigne' => $consigne,
            'echeance_le' => $echeance,
            'publie_le' => $publieLe,
            'est_exemple' => true,
        ]);

        foreach ($questions as $rang => $question) {
            $devoir->questions()->attach($question->id, ['ordre' => $rang + 1]);
        }

        return $devoir;
    }

    private function repondre(TentativeService $tentatives, User $eleve, Question $question, bool $juste, CarbonImmutable $saisiLe, ?Seance $seance = null): void
    {
        $option = $juste
            ? $question->reponse_attendue['option']
            : array_values(array_filter($question->donnees['options'], fn (array $o) => $o['id'] !== $question->reponse_attendue['option']))[0]['id'];

        $tentatives->enregistrer($eleve, (string) Str::uuid7(), $question, (int) $question->numeroPublie(), ['option' => $option], $seance, 45, $saisiLe, $saisiLe);
    }
}
