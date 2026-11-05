<?php

namespace App\Services;

use App\Models\Badge;
use App\Models\BadgeObtenu;
use App\Models\Defi;
use App\Models\ExamenBlanc;
use App\Models\Maitrise;
use App\Models\ParticipationDefi;
use App\Models\PointEffort;
use App\Models\ProfilEleve;
use App\Models\Question;
use App\Models\Seance;
use App\Models\SerieJour;
use App\Models\Tentative;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Closure;

/**
 * **Seule autorité** sur la motivation (PLAN M9) : série de jours, points
 * d'effort, niveaux, badges, défi de la semaine. Rien n'est écrit ailleurs.
 *
 *  - **Série** : un jour compte dès qu'il y a eu un geste (réponse, leçon
 *    ouverte, examen blanc), **au jour du geste** (`saisi_le`, A.6). Un
 *    **jour de grâce** par semaine (du lundi au dimanche) : un jour sans
 *    rien, entouré de jours faits, ne rompt pas la série — les coupures de
 *    courant ne punissent pas l'élève. La grâce ne compte pas comme un jour
 *    fait. L'objectif du soir est atteint par une séance terminée, ou par
 *    le temps passé sur les exercices (≥ l'objectif choisi).
 *  - **Points d'effort**, comptés **à la réception** (`recu_le`, A.6) :
 *    1 par réponse (juste ou non : c'est l'effort qui compte), 20 par séance
 *    terminée, 50 par examen blanc, 30 par défi réussi, et les points de
 *    chaque badge. Chaque gain a une source unique : rejoué, il ne compte
 *    qu'une fois.
 *  - **Niveaux** : paliers fixes de points (`NIVEAUX`).
 *  - **Badges** : catalogue semé (BadgeSeeder) ; chaque badge a sa règle
 *    ici (`regles()`), vérifiée après chaque geste ; obtenu une fois.
 *  - **Défi de la semaine** : `2 × questions d'une séance` bonnes réponses
 *    dans la matière où l'effort rapporte le plus (MaitriseService), fixé
 *    pour la semaine dès qu'il est proposé.
 *
 * Aucune mécanique de pression : pas de rang entre élèves (classements
 * opt-in, V1.1), pas de série « perdue » culpabilisante.
 */
class MotivationService
{
    public const POINTS = ['reponse' => 1, 'seance' => 20, 'examen_blanc' => 50, 'defi' => 30];

    public const NIVEAUX = [0, 50, 150, 300, 500, 800, 1200, 1700, 2300, 3000];

    private const JOURS = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];

    public function __construct(private MaitriseService $maitrise) {}

    /* ---------- Après chaque geste ---------- */

    public function apresTentative(Tentative $tentative): void
    {
        $this->noterActivite($tentative->user_id, CarbonImmutable::instance($tentative->saisi_le), 1, $tentative->duree_secondes ?? 0);
        $this->crediter($tentative->user_id, 'reponse', $tentative->uuid, self::POINTS['reponse'], $tentative->recu_le);
        $this->apresEvaluation($tentative);
    }

    /** Une réponse vient d'être notée (y compris par auto-évaluation). */
    public function apresEvaluation(Tentative $tentative): void
    {
        $this->verifierDefi($tentative);
        $this->verifierBadges($tentative->user_id, $tentative->recu_le);
    }

    public function apresSeance(Seance $seance, CarbonImmutable $saisiLe, CarbonInterface $recuLe): void
    {
        $jour = $this->noterActivite($seance->user_id, $saisiLe, 0, 0);
        $jour->update(['objectif_atteint' => true]);
        $this->crediter($seance->user_id, 'seance', $seance->uuid, self::POINTS['seance'], $recuLe);
        $this->verifierBadges($seance->user_id, $recuLe);
    }

    public function apresExamenBlanc(ExamenBlanc $examen): void
    {
        $this->noterActivite($examen->user_id, CarbonImmutable::instance($examen->termine_le), 0, 0);
        $this->crediter($examen->user_id, 'examen_blanc', $examen->uuid, self::POINTS['examen_blanc'], $examen->recu_le);
        $this->verifierBadges($examen->user_id, $examen->recu_le);
    }

    public function apresLecon(int $userId, CarbonImmutable $saisiLe): void
    {
        $this->noterActivite($userId, $saisiLe, 0, 0);
    }

    private function noterActivite(int $userId, CarbonImmutable $saisiLe, int $reponses, int $secondes): SerieJour
    {
        $jour = SerieJour::query()->firstOrCreate(['user_id' => $userId, 'jour' => $saisiLe->toDateString()]);

        if ($reponses > 0 || $secondes > 0) {
            $jour->reponses += $reponses;
            $jour->secondes += $secondes;
            $objectif = ProfilEleve::query()->where('user_id', $userId)->value('objectif_minutes');

            if ($objectif !== null && $jour->secondes >= (int) $objectif * 60) {
                $jour->objectif_atteint = true;
            }

            $jour->save();
        }

        return $jour;
    }

    private function crediter(int $userId, string $source, string $cle, int $points, CarbonInterface $recuLe): void
    {
        PointEffort::query()->firstOrCreate(
            ['user_id' => $userId, 'source' => $source, 'source_cle' => $cle],
            ['points' => $points, 'recu_le' => $recuLe],
        );
    }

    /* ---------- Série ---------- */

    /**
     * La série et la trace sur deux semaines (DESIGN.md § 6.3) : de lundi
     * dernier à dimanche prochain, chaque case `objectif` (pleine), `commence`
     * (à moitié), `grace` (étoile), `aujourdhui` (pas encore fait), `manque`
     * ou `a_venir`.
     *
     * @return array{jours: int, rompue: bool, aujourdhui_fait: bool, reponses_semaine: int, cases: list<array{date: string, jour: string, etat: string}>, calcule_le: string}
     */
    public function serie(int $userId, ?CarbonImmutable $maintenant = null): array
    {
        $maintenant ??= CarbonImmutable::now();
        $aujourdhui = $maintenant->startOfDay();
        $lignes = SerieJour::query()
            ->where('user_id', $userId)
            ->where('jour', '>=', $aujourdhui->subDays(400)->toDateString())
            ->get()
            ->keyBy(fn (SerieJour $jour) => $jour->jour->toDateString());
        $actif = fn (CarbonImmutable $jour): bool => $lignes->has($jour->toDateString());

        [$jours, $graces] = $this->compterSerie($actif, $aujourdhui);
        $debut = $aujourdhui->startOfWeek()->subWeek();
        $cases = [];

        for ($rang = 0; $rang < 14; $rang++) {
            $date = $debut->addDays($rang);
            $cle = $date->toDateString();
            $cases[] = [
                'date' => $cle,
                'jour' => self::JOURS[$rang % 7],
                'etat' => match (true) {
                    $date->greaterThan($aujourdhui) => 'a_venir',
                    $lignes->has($cle) => $lignes->get($cle)->objectif_atteint ? 'objectif' : 'commence',
                    in_array($cle, $graces, true) => 'grace',
                    $date->equalTo($aujourdhui) => 'aujourdhui',
                    default => 'manque',
                },
            ];
        }

        return [
            'jours' => $jours,
            'rompue' => $jours === 0 && $lignes->isNotEmpty(),
            'aujourdhui_fait' => $actif($aujourdhui),
            'reponses_semaine' => (int) $lignes->filter(fn (SerieJour $jour) => $jour->jour->greaterThanOrEqualTo($aujourdhui->startOfWeek()))->sum('reponses'),
            'cases' => $cases,
            'calcule_le' => $maintenant->toIso8601ZuluString('millisecond'),
        ];
    }

    /**
     * Remonte depuis aujourd'hui (ou hier, si rien n'est encore fait
     * aujourd'hui) : chaque jour fait compte ; un jour manqué est pardonné
     * une fois par semaine s'il est précédé d'un jour fait.
     *
     * @param  Closure(CarbonImmutable): bool  $actif
     * @return array{0: int, 1: list<string>} nombre de jours faits, jours de grâce
     */
    private function compterSerie(Closure $actif, CarbonImmutable $aujourdhui): array
    {
        $jour = $actif($aujourdhui) ? $aujourdhui : $aujourdhui->subDay();
        $jours = 0;
        $graces = [];
        $semainesGraciees = [];

        while (true) {
            if ($actif($jour)) {
                $jours++;
            } else {
                $semaine = $jour->startOfWeek()->toDateString();

                // Hier peut être gracié même si rien n'est encore fait aujourd'hui.
                if (($jours === 0 && ! $jour->equalTo($aujourdhui->subDay())) || isset($semainesGraciees[$semaine]) || ! $actif($jour->subDay())) {
                    break;
                }

                $semainesGraciees[$semaine] = true;
                $graces[] = $jour->toDateString();
            }

            $jour = $jour->subDay();
        }

        return [$jours, $graces];
    }

    /* ---------- Points et niveaux ---------- */

    /**
     * @return array{total: int, niveau: int, palier: int, prochain_palier: int|null}
     */
    public function points(int $userId): array
    {
        $total = (int) PointEffort::query()->where('user_id', $userId)->sum('points');
        $niveau = count(array_filter(self::NIVEAUX, fn (int $seuil) => $seuil <= $total));

        return [
            'total' => $total,
            'niveau' => $niveau,
            'palier' => self::NIVEAUX[$niveau - 1],
            'prochain_palier' => self::NIVEAUX[$niveau] ?? null,
        ];
    }

    /* ---------- Badges ---------- */

    /**
     * Les règles des badges, par clé du catalogue.
     *
     * @return array<string, Closure(int): bool>
     */
    private function regles(): array
    {
        $serie = null;
        $jours = function (int $userId) use (&$serie): int {
            return ($serie ??= $this->serie($userId))['jours'];
        };
        $maitrisees = fn (int $userId): int => Maitrise::query()->where('user_id', $userId)->where('score', '>=', MaitriseService::SEUIL_MAITRISEE)->count();

        return [
            'premier_exercice' => fn (int $id) => Tentative::query()->where('user_id', $id)->exists(),
            'premiere_seance' => fn (int $id) => Seance::query()->where('user_id', $id)->whereNotNull('termine_le')->exists(),
            'premier_examen_blanc' => fn (int $id) => ExamenBlanc::query()->where('user_id', $id)->exists(),
            'serie_3' => fn (int $id) => $jours($id) >= 3,
            'serie_7' => fn (int $id) => $jours($id) >= 7,
            'serie_30' => fn (int $id) => $jours($id) >= 30,
            'premiere_notion' => fn (int $id) => $maitrisees($id) >= 1,
            'dix_notions' => fn (int $id) => $maitrisees($id) >= 10,
            'chapitre_maitrise' => function (int $id): bool {
                $profil = ProfilEleve::query()->where('user_id', $id)->first();

                return $profil !== null && $this->maitrise->chapitresMaitrises($profil) >= 1;
            },
            'cent_reponses' => fn (int $id) => Tentative::query()->where('user_id', $id)->count() >= 100,
            'examen_blanc_moyenne' => fn (int $id) => ExamenBlanc::query()->where('user_id', $id)->where('note_sur_20', '>=', 10)->exists(),
            'defi_reussi' => fn (int $id) => ParticipationDefi::query()->where('user_id', $id)->whereNotNull('reussi_le')->exists(),
        ];
    }

    public function verifierBadges(int $userId, CarbonInterface $quand): void
    {
        $obtenus = BadgeObtenu::query()->where('user_id', $userId)->pluck('badge_id')->flip();
        $catalogue = Badge::query()->get()->keyBy('cle');

        foreach ($this->regles() as $cle => $regle) {
            $badge = $catalogue->get($cle);

            if ($badge === null || $obtenus->has($badge->id) || ! $regle($userId)) {
                continue;
            }

            BadgeObtenu::query()->firstOrCreate(['user_id' => $userId, 'badge_id' => $badge->id], ['obtenu_le' => $quand]);
            $this->crediter($userId, 'badge', $cle, $badge->points, $quand);
        }
    }

    /**
     * Le catalogue, dans l'ordre, chaque badge avec sa date d'obtention
     * (vide : à gagner).
     *
     * @return list<array{cle: string, nom: string, description: string, icone: string, points: int, obtenu_le: string|null}>
     */
    public function badges(int $userId): array
    {
        $obtenus = BadgeObtenu::query()->where('user_id', $userId)->get()->keyBy('badge_id');

        return array_values(Badge::query()->orderBy('ordre')->get()->map(fn (Badge $badge) => [
            'cle' => $badge->cle,
            'nom' => $badge->nom,
            'description' => $badge->description,
            'icone' => $badge->icone,
            'points' => $badge->points,
            'obtenu_le' => $obtenus->get($badge->id)?->obtenu_le?->toIso8601ZuluString(),
        ])->all());
    }

    /* ---------- Défi de la semaine ---------- */

    /**
     * Le défi de cette semaine, proposé à la première demande. `null` : aucune
     * matière n'a encore de questions.
     *
     * @return array{cle: string, matiere: string, objectif: int, fait: int, reussi: bool, fin: string}|null
     */
    public function defi(ProfilEleve $profil, ?CarbonImmutable $maintenant = null): ?array
    {
        $maintenant ??= CarbonImmutable::now();
        $lundi = $maintenant->startOfWeek();
        $participation = ParticipationDefi::query()
            ->where('user_id', $profil->user_id)
            ->whereHas('defi', fn ($requete) => $requete->whereDate('semaine', $lundi->toDateString()))
            ->with('defi.matiere')
            ->first();

        if ($participation === null) {
            $matiereId = array_key_first($this->maitrise->poidsMatieres($profil));

            if ($matiereId === null) {
                return null;
            }

            $defi = Defi::query()->firstOrCreate([
                'semaine' => $lundi->toDateString(),
                'matiere_id' => $matiereId,
                'type' => Defi::BONNES_REPONSES,
                'objectif' => 2 * SeanceService::nombreDeQuestions($profil->objectif_minutes),
            ]);
            $participation = ParticipationDefi::query()->firstOrCreate(['defi_id' => $defi->id, 'user_id' => $profil->user_id]);
            $participation->load('defi.matiere');
        }

        $defi = $participation->defi;

        return [
            'cle' => $defi->matiere->teinte->value,
            'matiere' => $defi->matiere->nom,
            'objectif' => $defi->objectif,
            'fait' => min($defi->objectif, $this->bonnesReponses($profil->user_id, $defi)),
            'reussi' => $participation->reussi_le !== null,
            'fin' => $lundi->addDays(6)->toDateString(),
        ];
    }

    private function verifierDefi(Tentative $tentative): void
    {
        if ($tentative->correcte !== true) {
            return;
        }

        $lundi = CarbonImmutable::instance($tentative->saisi_le)->startOfWeek();
        $participation = ParticipationDefi::query()
            ->where('user_id', $tentative->user_id)
            ->whereNull('reussi_le')
            ->whereHas('defi', fn ($requete) => $requete->whereDate('semaine', $lundi->toDateString()))
            ->with('defi')
            ->first();

        if ($participation === null || $this->bonnesReponses($tentative->user_id, $participation->defi) < $participation->defi->objectif) {
            return;
        }

        $participation->update(['reussi_le' => $tentative->recu_le]);
        $this->crediter($tentative->user_id, 'defi', (string) $participation->defi_id, self::POINTS['defi'], $tentative->recu_le);
    }

    private function bonnesReponses(int $userId, Defi $defi): int
    {
        $lundi = CarbonImmutable::instance($defi->semaine)->startOfDay();

        return Tentative::query()
            ->where('user_id', $userId)
            ->where('correcte', true)
            ->where('saisi_le', '>=', $lundi)
            ->where('saisi_le', '<', $lundi->addWeek())
            ->whereIn('question_id', Question::query()
                ->whereHas('notion.chapitre', fn ($chapitre) => $chapitre->where('matiere_id', $defi->matiere_id))
                ->select('id'))
            ->count();
    }
}
