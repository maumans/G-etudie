<?php

namespace App\Services;

use App\Enums\StatutContenu;
use App\Models\Maitrise;
use App\Models\ProfilEleve;
use App\Models\Question;
use App\Models\Seance;
use App\Models\Tentative;
use App\Models\User;
use App\Services\HorsLigne\OperationRejetee;
use App\Support\CatalogueEleve;
use App\Support\PresentationQuestion;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * La séance du jour (PLAN M8 « Séance du jour », lot 6). Les questions sont
 * choisies **sur le serveur seulement** (HORS_LIGNE.md A.10), dans cet ordre :
 *
 *  1. les **révisions dues** (révision espacée, MaitriseService), la plus
 *     ancienne d'abord, une question par notion ;
 *  2. les notions **commencées et pas encore maîtrisées**, puis
 *  3. les notions **jamais travaillées**, puis
 *  4. le reste ; dans 2 à 4, la matière où l'effort rapporte le plus
 *     d'abord (coefficient × ce qui manque), en alternant les matières.
 *
 * Deux questions d'une même notion au plus par séance (sauf s'il n'y a pas
 * assez d'autres questions) ; parmi les questions d'une notion, celles
 * jamais vues, puis celles vues il y a le plus longtemps. Ordre stable, sans
 * hasard.
 *
 * **Séances préparées d'avance** (HL4) : il y en a toujours trois
 * (`aVenir`), envoyées à l'appareil, qui les fait hors ligne l'une après
 * l'autre ; « Commencer » en ligne prend la première — la même. Quand une
 * réponse a été comptée depuis leur préparation, elles sont **remplacées**
 * par des plus fraîches (`remplacee_le`), jamais supprimées : un appareil
 * resté hors ligne peut encore y répondre.
 */
class SeanceService
{
    /** Questions par objectif du soir (minutes => questions). */
    public const QUESTIONS_PAR_OBJECTIF = [10 => 5, 15 => 8, 30 => 15];

    public const SEANCES_D_AVANCE = 3;

    public const QUESTIONS_PAR_NOTION = 2;

    public function __construct(
        private MaitriseService $maitrise,
        private MotivationService $motivation,
    ) {}

    public static function nombreDeQuestions(int $objectifMinutes): int
    {
        return self::QUESTIONS_PAR_OBJECTIF[$objectifMinutes] ?? 8;
    }

    /** La séance du jour commencée et pas encore terminée, s'il y en a une. */
    public function enCours(User $eleve): ?Seance
    {
        return Seance::query()
            ->where('user_id', $eleve->id)
            ->whereDate('jour', CarbonImmutable::today())
            ->whereNull('termine_le')
            ->latest('id')
            ->first();
    }

    /**
     * Reprend la séance du jour en cours, sinon commence la première des
     * séances préparées. `null` : aucune question publiée pour cet élève.
     */
    public function commencer(User $eleve): ?Seance
    {
        $profil = CatalogueEleve::profil($eleve);

        if ($profil === null) {
            return null;
        }

        $enCours = $this->enCours($eleve);

        if ($enCours !== null) {
            return $enCours;
        }

        $seance = $this->aVenir($eleve, $profil)->first();
        $seance?->update(['jour' => CarbonImmutable::today()->toDateString()]);

        return $seance;
    }

    /**
     * Une séance préparée reçoit une réponse (hors ligne, sans « Commencer »
     * en ligne) : elle prend le jour de cette réponse.
     */
    public function demarrer(Seance $seance, CarbonImmutable $saisiLe): void
    {
        if ($seance->jour === null) {
            $seance->update(['jour' => $saisiLe->toDateString()]);
        }
    }

    /**
     * Les prochaines séances préparées (trois), dans l'ordre, complétées ou
     * remplacées s'il le faut.
     *
     * @return EloquentCollection<int, Seance>
     */
    public function aVenir(User $eleve, ?ProfilEleve $profil = null): EloquentCollection
    {
        $profil ??= CatalogueEleve::profil($eleve);

        if ($profil === null) {
            return new EloquentCollection;
        }

        return DB::transaction(function () use ($eleve, $profil) {
            // Une demande à la fois par élève : jamais six séances préparées.
            User::query()->whereKey($eleve->id)->lockForUpdate()->first();

            $preparees = $this->preparees($eleve);
            $derniereReponse = Maitrise::query()->where('user_id', $eleve->id)->max('maj_le');
            $perimees = $preparees->contains(fn (Seance $seance) => $seance->duree_minutes !== $profil->objectif_minutes
                || ($derniereReponse !== null && $seance->genere_le->lessThan(CarbonImmutable::parse($derniereReponse)->startOfSecond())));

            if ($perimees) {
                Seance::query()->whereKey($preparees->modelKeys())->update(['remplacee_le' => CarbonImmutable::now()]);
                $preparees = new EloquentCollection;
            }

            /** @var list<int> $dejaPrises */
            $dejaPrises = array_merge([], ...$preparees->map(fn (Seance $seance) => $seance->questions)->all());
            $rang = (int) ($preparees->max('rang') ?? 0);

            while ($preparees->count() < self::SEANCES_D_AVANCE) {
                $questions = $this->choisir($eleve, $profil, $dejaPrises);

                if ($questions === []) {
                    break;
                }

                $dejaPrises = [...$dejaPrises, ...$questions];
                $preparees->push(Seance::create([
                    'uuid' => (string) Str::uuid7(),
                    'user_id' => $eleve->id,
                    'jour' => null,
                    'rang' => ++$rang,
                    'questions' => $questions,
                    'duree_minutes' => $profil->objectif_minutes,
                    'genere_le' => CarbonImmutable::now(),
                ]));
            }

            return $preparees->values();
        });
    }

    /** @return EloquentCollection<int, Seance> */
    private function preparees(User $eleve): EloquentCollection
    {
        return Seance::query()
            ->where('user_id', $eleve->id)
            ->whereNull('jour')
            ->whereNull('termine_le')
            ->whereNull('remplacee_le')
            ->orderBy('rang')
            ->orderBy('id')
            ->get();
    }

    /**
     * Opération `seance.terminer`. Une séance déjà terminée est acceptée sans
     * rien rejouer (HORS_LIGNE.md A.6).
     */
    public function terminer(User $eleve, Seance $seance, CarbonImmutable $saisiLe, ?CarbonImmutable $recuLe = null): Seance
    {
        if ($seance->user_id !== $eleve->id) {
            throw new OperationRejetee('Cette séance n\'est pas la tienne.');
        }

        if ($seance->termine_le === null) {
            $seance->update(['termine_le' => $saisiLe, 'jour' => $seance->jour ?? $saisiLe->toDateString()]);
            $this->motivation->apresSeance($seance, $saisiLe, $recuLe ?? CarbonImmutable::now());
        }

        return $seance;
    }

    /**
     * Les props de l'écran de séance (`eleve/seance`) : celles que sert la
     * route en ligne et celles que l'appareil range pour la faire hors
     * ligne (A.4 : l'écran ne sait pas d'où elles viennent).
     *
     * @return array{seance: array{uuid: string, duree_minutes: int, terminee: bool}, questions: list<array<string, mixed>>, reponses: list<array<string, mixed>>}
     */
    public function props(Seance $seance): array
    {
        $uuids = Question::query()->whereKey($seance->questions)->pluck('uuid', 'id');

        return [
            'seance' => [
                'uuid' => $seance->uuid,
                'duree_minutes' => $seance->duree_minutes,
                'terminee' => $seance->termine_le !== null,
            ],
            'questions' => $this->questionsDe($seance),
            // Réponses déjà reçues par le serveur : la séance reprend là où
            // l'élève l'a laissée (les réponses encore en file sont lues sur
            // l'appareil).
            'reponses' => array_values(Tentative::query()
                ->where('seance_id', $seance->id)
                ->orderBy('saisi_le')
                ->get()
                ->map(fn (Tentative $tentative) => [
                    'question' => $uuids->get($tentative->question_id),
                    'tentative' => $tentative->uuid,
                    'reponse' => (object) $tentative->reponse,
                    'score' => $tentative->score,
                    'auto_evaluee' => $tentative->auto_evaluee_le !== null,
                ])
                ->all()),
        ];
    }

    /**
     * Les questions d'une séance, dans l'ordre (voir la doc de la classe).
     * Celles de `$exclues` (déjà dans une séance préparée) ne viennent qu'en
     * dernier, si l'élève n'en a pas assez d'autres.
     *
     * @param  list<int>  $exclues
     * @return list<int>
     */
    private function choisir(User $eleve, ProfilEleve $profil, array $exclues = []): array
    {
        $questions = CatalogueEleve::questions($profil)->with('notion.chapitre')->orderBy('id')->get();

        if ($questions->isEmpty()) {
            return [];
        }

        $aujourdhui = CarbonImmutable::today();
        $voulues = self::nombreDeQuestions($profil->objectif_minutes);
        $maitrises = $this->maitrise->maitrises($eleve->id);
        $rangMatiere = array_flip(array_keys($this->maitrise->poidsMatieres($profil)));
        $matiereDe = $questions->mapWithKeys(fn (Question $question) => [$question->id => $question->notion->chapitre->matiere_id])->all();
        $notionDe = $questions->mapWithKeys(fn (Question $question) => [$question->id => $question->notion_id])->all();

        // Dernière réponse de l'élève à chaque question.
        $vueLe = Tentative::query()
            ->where('user_id', $eleve->id)
            ->whereIn('question_id', $questions->modelKeys())
            ->groupBy('question_id')
            ->selectRaw('question_id, max(saisi_le) as vue_le')
            ->pluck('vue_le', 'question_id');

        $exclues = array_flip($exclues);
        $parFraicheur = $questions->sortBy([
            fn (Question $a, Question $b) => isset($exclues[$a->id]) <=> isset($exclues[$b->id]),
            fn (Question $a, Question $b) => (string) ($vueLe[$a->id] ?? '') <=> (string) ($vueLe[$b->id] ?? ''),
            fn (Question $a, Question $b) => $a->notion->chapitre->ordre <=> $b->notion->chapitre->ordre,
            fn (Question $a, Question $b) => $a->notion->ordre <=> $b->notion->ordre,
            fn (Question $a, Question $b) => $a->id <=> $b->id,
        ])->values();

        /** @var array<int, list<int>> $groupes */
        $groupes = [1 => [], 2 => [], 3 => [], 4 => []];

        foreach ($parFraicheur as $question) {
            $maitrise = $maitrises->get($question->notion_id);
            $groupes[match (true) {
                $maitrise === null => 3,
                MaitriseService::etat($maitrise, $aujourdhui) === 'a_revoir' => 1,
                $maitrise->score < MaitriseService::SEUIL_MAITRISEE => 2,
                default => 4,
            }][] = $question->id;
        }

        // Révisions : la plus ancienne due d'abord, une question par notion.
        $dues = collect($groupes[1])
            ->unique(fn (int $id) => $notionDe[$id])
            ->sortBy(fn (int $id) => $maitrises->get($notionDe[$id])?->prochaine_revision_le?->toDateString())
            ->values()
            ->all();

        $parMatiere = fn (array $ids): array => self::alterner(
            collect($ids)->sortBy(fn (int $id) => $rangMatiere[$matiereDe[$id]] ?? PHP_INT_MAX)->values()->all(),
            $matiereDe,
        );

        $ordre = [...$dues, ...$parMatiere($groupes[2]), ...$parMatiere($groupes[3]), ...$parMatiere($groupes[4]), ...$groupes[1]];
        $choisies = [];
        $parNotion = [];

        // D'abord deux questions par notion au plus, sans les questions déjà
        // prises par une autre séance préparée ; s'il en manque, sans
        // plafond ; en dernier recours seulement, les questions déjà prises.
        foreach ([[true, true], [false, true], [false, false]] as [$plafond, $sansExclues]) {
            foreach ($ordre as $id) {
                if (count($choisies) >= $voulues) {
                    break 2;
                }

                if (isset($choisies[$id])
                    || ($sansExclues && isset($exclues[$id]))
                    || ($plafond && ($parNotion[$notionDe[$id]] ?? 0) >= self::QUESTIONS_PAR_NOTION)) {
                    continue;
                }

                $choisies[$id] = true;
                $parNotion[$notionDe[$id]] = ($parNotion[$notionDe[$id]] ?? 0) + 1;
            }
        }

        return array_keys($choisies);
    }

    /**
     * Alterne les matières, une question de chacune tour à tour : une séance
     * courte en touche plusieurs. La première matière rencontrée passe
     * d'abord. Ordre stable, sans hasard.
     *
     * @param  array<int, int>  $ids
     * @param  array<int, int>  $matiereDe  question => matière
     * @return list<int>
     */
    private static function alterner(array $ids, array $matiereDe): array
    {
        $groupes = [];

        foreach ($ids as $id) {
            $groupes[$matiereDe[$id] ?? 0][] = $id;
        }

        $ordre = [];

        while ($groupes !== []) {
            foreach ($groupes as $matiere => $file) {
                $ordre[] = array_shift($file);

                if ($file === []) {
                    unset($groupes[$matiere]);
                } else {
                    $groupes[$matiere] = $file;
                }
            }
        }

        return $ordre;
    }

    /**
     * Les questions d'une séance, dans l'ordre, telles que l'appareil les
     * affiche et les corrige : leur **version publiée** (PresentationQuestion).
     * Une question retirée depuis n'est plus proposée (A.9).
     *
     * @return list<array<string, mixed>>
     */
    public function questionsDe(Seance $seance): array
    {
        $questions = Question::query()
            ->with(['notion.chapitre.matiere', 'versionPubliee'])
            ->whereKey($seance->questions)
            ->where('statut', '!=', StatutContenu::Archive->value)
            ->get()
            ->keyBy('id');

        return array_values(collect($seance->questions)
            ->map(fn (int $id) => $questions->get($id))
            ->filter()
            ->map(fn (Question $question) => PresentationQuestion::publiee($question))
            ->filter()
            ->all());
    }
}
