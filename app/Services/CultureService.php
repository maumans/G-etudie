<?php

namespace App\Services;

use App\Models\Chapitre;
use App\Models\Question;
use App\Models\Seance;
use App\Models\Tentative;
use App\Models\User;
use App\Services\Organisation\GesteRefuse;
use App\Support\CatalogueEleve;
use App\Support\PresentationQuestion;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Culture générale (lot 12, PLAN M10) : Guinée, Afrique, Monde. Seule
 * autorité pour la question du jour et les quiz ; les questions viennent de
 * CatalogueEleve::questionsCulture (matière transversale : tout élève, hors
 * jauge, hors coefficients).
 *
 *  - **Question du jour** : la même pour tous les élèves le même jour (on en
 *    parle entre amis), tirée d'un ordre stable propre à chaque question,
 *    sans hasard ; toutes passent avant qu'une revienne. La réponse part par
 *    la file (`tentative.enregistrer`, sans séance) : elle compte pour la
 *    série et les points, jamais pour la jauge (MaitriseService).
 *  - **Quiz** : une séance de cinq questions marquée `culture` (jamais la
 *    séance du jour), jouée par l'écran de séance ; d'abord les questions
 *    jamais vues, puis les plus anciennes. Un quiz est **préparé d'avance**
 *    pour l'appareil (HL4) : hors ligne, « Lancer un quiz » ouvre celui-là.
 */
class CultureService
{
    public const QUESTIONS_PAR_QUIZ = 5;

    public const JOURS_D_AVANCE = 7;

    /** La question du jour (même pour tous), ou `null` sans question publiée. */
    public function questionDuJour(CarbonImmutable $jour): ?Question
    {
        $ids = $this->ordreDesQuestions();

        if ($ids === []) {
            return null;
        }

        $numero = intdiv($jour->startOfDay()->getTimestamp() + $jour->getOffset(), 86400);

        return Question::query()
            ->with(['notion.chapitre.matiere', 'versionPubliee'])
            ->find($ids[$numero % count($ids)]);
    }

    /**
     * Ce que montrent l'accueil et l'écran « Culture générale » : la question
     * du jour, et si l'élève y a déjà répondu ce jour-là.
     *
     * @return array{date: string, question: array<string, mixed>, repondue: bool, score: int|null}|null
     */
    public function etatDuJour(User $eleve, CarbonImmutable $jour): ?array
    {
        $question = $this->questionDuJour($jour);
        $presentee = $question === null ? null : PresentationQuestion::publiee($question);

        if ($question === null || $presentee === null) {
            return null;
        }

        $tentative = Tentative::query()
            ->where('user_id', $eleve->id)
            ->where('question_id', $question->id)
            ->whereNull('seance_id')
            ->whereBetween('saisi_le', [$jour->startOfDay(), $jour->endOfDay()])
            ->orderByDesc('saisi_le')
            ->orderByDesc('id')
            ->first();

        return [
            'date' => $jour->toDateString(),
            'question' => $presentee,
            'repondue' => $tentative !== null,
            'score' => $tentative?->score,
        ];
    }

    /**
     * Les questions du jour d'aujourd'hui et des jours suivants, pour
     * l'appareil (instantané, HL4) : hors ligne, la carte prend celle du jour
     * de l'appareil.
     *
     * @return list<array{date: string, question: array<string, mixed>}>
     */
    public function joursAVenir(CarbonImmutable $aujourdhui): array
    {
        $jours = [];

        for ($decalage = 0; $decalage < self::JOURS_D_AVANCE; $decalage++) {
            $jour = $aujourdhui->addDays($decalage);
            $question = $this->questionDuJour($jour);
            $presentee = $question === null ? null : PresentationQuestion::publiee($question);

            if ($presentee !== null) {
                $jours[] = ['date' => $jour->toDateString(), 'question' => $presentee];
            }
        }

        return $jours;
    }

    /**
     * Les thèmes (chapitres de culture), avec leurs questions publiées et la
     * réussite de l'élève (dernière réponse à chaque question).
     *
     * @return list<array{id: int, titre: string, questions: int, faites: int, reussite: int|null, est_exemple: bool}>
     */
    public function themes(User $eleve): array
    {
        $themes = CatalogueEleve::chapitresCulture()->orderBy('ordre')->orderBy('id')->get();
        $questions = CatalogueEleve::questionsCulture()->with('notion')->get(['id', 'notion_id', 'est_exemple']);
        $dernieres = $this->dernieresReponses($eleve, $questions->modelKeys());

        return array_values($themes->map(function (Chapitre $theme) use ($questions, $dernieres) {
            $siennes = $questions->filter(fn (Question $q) => $q->notion->chapitre_id === $theme->id);
            $scores = $siennes->map(fn (Question $q) => $dernieres[$q->id] ?? null)->filter(fn ($s) => $s !== null);

            return [
                'id' => $theme->id,
                'titre' => $theme->titre,
                'questions' => $siennes->count(),
                'faites' => $scores->count(),
                'reussite' => $scores->isEmpty() ? null : (int) round($scores->avg()),
                'est_exemple' => $theme->est_exemple || $siennes->contains('est_exemple', true),
            ];
        })->filter(fn (array $theme) => $theme['questions'] > 0)->all());
    }

    /**
     * L'élève lance un quiz (en ligne) : il reprend celui d'aujourd'hui pas
     * fini, sinon prend le quiz préparé (tous thèmes), sinon en compose un.
     */
    public function lancer(User $eleve, ?Chapitre $theme = null): Seance
    {
        if ($theme !== null && ! CatalogueEleve::chapitresCulture()->whereKey($theme->id)->exists()) {
            throw new GesteRefuse('Ce thème n\'existe pas.');
        }

        return DB::transaction(function () use ($eleve, $theme) {
            User::query()->whereKey($eleve->id)->lockForUpdate()->first();

            $enCours = Seance::query()
                ->where('user_id', $eleve->id)
                ->where('culture', true)
                ->whereDate('jour', CarbonImmutable::today())
                ->whereNull('termine_le')
                ->latest('id')
                ->first();

            if ($enCours !== null && $theme === null) {
                return $enCours;
            }

            $preparee = $theme === null ? $this->preparee($eleve) : null;

            if ($preparee !== null) {
                $preparee->update(['jour' => CarbonImmutable::today()->toDateString()]);

                return $preparee;
            }

            return $this->composer($eleve, $theme, CarbonImmutable::today()->toDateString())
                ?? throw new GesteRefuse('Pas encore de question dans ce thème.');
        });
    }

    /**
     * Le quiz préparé pour l'appareil (hors ligne) : créé s'il manque.
     *
     * @return EloquentCollection<int, Seance>
     */
    public function aVenir(User $eleve): EloquentCollection
    {
        return DB::transaction(function () use ($eleve) {
            User::query()->whereKey($eleve->id)->lockForUpdate()->first();

            $seance = $this->preparee($eleve) ?? $this->composer($eleve, null, null);

            return new EloquentCollection($seance === null ? [] : [$seance]);
        });
    }

    /**
     * Les derniers quiz terminés (score moyen), les plus récents d'abord.
     *
     * @return list<array{uuid: string, termine_le: string, questions: int, score: int|null, justes: int}>
     */
    public function historique(User $eleve, int $limite = 5): array
    {
        $seances = Seance::query()
            ->where('user_id', $eleve->id)
            ->where('culture', true)
            ->whereNotNull('termine_le')
            ->orderByDesc('termine_le')
            ->orderByDesc('id')
            ->limit($limite)
            ->get();
        $scores = Tentative::query()
            ->whereIn('seance_id', $seances->modelKeys())
            ->whereNotNull('score')
            ->orderBy('saisi_le')
            ->orderBy('id')
            ->get(['seance_id', 'question_id', 'score'])
            ->groupBy('seance_id');

        return array_values($seances->map(fn (Seance $seance) => [
            'uuid' => $seance->uuid,
            'termine_le' => $seance->termine_le->toIso8601ZuluString(),
            'questions' => count($seance->questions),
            // La dernière réponse à chaque question compte.
            'score' => ($s = $scores->get($seance->id)) === null ? null : (int) round($s->keyBy('question_id')->avg('score')),
            'justes' => ($s = $scores->get($seance->id)) === null ? 0 : $s->keyBy('question_id')->where('score', 100)->count(),
        ])->all());
    }

    private function preparee(User $eleve): ?Seance
    {
        return Seance::query()
            ->where('user_id', $eleve->id)
            ->where('culture', true)
            ->whereNull('jour')
            ->whereNull('termine_le')
            ->whereNull('remplacee_le')
            ->orderBy('id')
            ->first();
    }

    private function composer(User $eleve, ?Chapitre $theme, ?string $jour): ?Seance
    {
        $ids = CatalogueEleve::questionsCulture($theme)->orderBy('id')->pluck('id')->all();

        if ($ids === []) {
            return null;
        }

        $vueLe = Tentative::query()
            ->where('user_id', $eleve->id)
            ->whereIn('question_id', $ids)
            ->groupBy('question_id')
            ->selectRaw('question_id, max(saisi_le) as vue_le')
            ->pluck('vue_le', 'question_id');

        // Jamais vues d'abord (ordre stable propre à l'élève), puis les plus anciennes.
        usort($ids, fn (int $a, int $b) => [(string) ($vueLe[$a] ?? ''), crc32($eleve->id.'|'.$a)]
            <=> [(string) ($vueLe[$b] ?? ''), crc32($eleve->id.'|'.$b)]);

        return Seance::create([
            'uuid' => (string) Str::uuid7(),
            'user_id' => $eleve->id,
            'jour' => $jour,
            'rang' => $jour === null ? 1 : null,
            'culture' => true,
            'questions' => array_slice($ids, 0, self::QUESTIONS_PAR_QUIZ),
            'duree_minutes' => 5,
            'genere_le' => CarbonImmutable::now(),
        ]);
    }

    /**
     * Les questions publiées dans un ordre stable propre à chacune
     * (indépendant de l'ordre de saisie) : la question du jour en suit le fil.
     *
     * @return list<int>
     */
    private function ordreDesQuestions(): array
    {
        $ids = CatalogueEleve::questionsCulture()->orderBy('id')->pluck('id')->map(fn ($id) => (int) $id)->all();
        usort($ids, fn (int $a, int $b) => [crc32('culture|'.$a), $a] <=> [crc32('culture|'.$b), $b]);

        return $ids;
    }

    /**
     * @param  array<int, int|string>  $questions  identifiants des questions
     * @return array<int, int> question => score de la dernière réponse notée
     */
    private function dernieresReponses(User $eleve, array $questions): array
    {
        $dernieres = [];

        Tentative::query()
            ->where('user_id', $eleve->id)
            ->whereIn('question_id', $questions)
            ->whereNotNull('score')
            ->orderBy('saisi_le')
            ->orderBy('id')
            ->get(['question_id', 'score'])
            ->each(function (Tentative $tentative) use (&$dernieres) {
                $dernieres[$tentative->question_id] = (int) $tentative->score;
            });

        return $dernieres;
    }
}
