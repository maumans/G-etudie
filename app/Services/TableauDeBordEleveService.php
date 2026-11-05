<?php

namespace App\Services;

use App\Enums\EtatLecon;
use App\Models\Lecon;
use App\Models\ProfilEleve;
use App\Models\ProgressionLecon;
use App\Models\Question;
use App\Models\Seance;
use App\Models\Tentative;
use App\Models\User;
use App\Support\BlocsContenu;
use App\Support\CatalogueEleve;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

/**
 * Les données de l'accueil élève (DESIGN.md § 6.0), assemblées depuis les
 * services qui font autorité : jauge (MaitriseService), séance du jour
 * (SeanceService), motivation (MotivationService), leçons visibles
 * (CatalogueEleve). Ce service ne décide
 * rien lui-même ; il met en forme.
 */
class TableauDeBordEleveService
{
    public function __construct(
        private MaitriseService $maitrise,
        private SeanceService $seances,
        private MotivationService $motivation,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function donnees(User $eleve, ProfilEleve $profil, ?CarbonImmutable $maintenant = null): array
    {
        $maintenant ??= CarbonImmutable::now();
        $lecons = CatalogueEleve::lecons($profil)->with(['notion.chapitre.matiere', 'versionPubliee'])->get();
        $progressions = ProgressionLecon::query()->where('user_id', $eleve->id)->get()->keyBy('lecon_id');

        return [
            'est_exemple' => $lecons->contains('est_exemple', true)
                || CatalogueEleve::questions($profil)->where('est_exemple', true)->exists(),
            'examen' => $profil->libelleExamen(),
            'compte_a_rebours' => $this->compteARebours($profil, $maintenant),
            'jauge' => $this->maitrise->jauge($profil),
            'seance' => $this->seance($eleve, $profil),
            'serie' => $this->motivation->serie($eleve->id, $maintenant),
            'points' => $this->motivation->points($eleve->id),
            'defi' => $this->motivation->defi($profil, $maintenant),
            'reussites' => $this->reussites($eleve),
            'progression' => $this->maitrise->parMatiere($profil)->map(function (array $matiere) use ($lecons, $progressions) {
                $siennes = $lecons->filter(fn (Lecon $lecon) => $lecon->notion->chapitre->matiere_id === $matiere['matiere_id']);

                return [
                    'cle' => $matiere['cle'],
                    'slug' => $matiere['slug'],
                    'notions' => $matiere['notions'],
                    'notions_maitrisees' => $matiere['maitrisees'],
                    'lecons' => $siennes->count(),
                    'lecons_comprises' => $siennes->filter(
                        fn (Lecon $lecon) => $progressions->get($lecon->id)?->etat === EtatLecon::Comprise,
                    )->count(),
                ];
            })->values()->all(),
            'reprendre' => $this->reprendre($lecons, $progressions),
            'premiers_pas' => $this->premiersPas($eleve, $progressions),
        ];
    }

    /**
     * @return array{date: string|null, jours: int|null}
     */
    private function compteARebours(ProfilEleve $profil, CarbonImmutable $maintenant): array
    {
        $date = $profil->examen->date_prochaine_session;

        if ($date === null || $date->lessThan($maintenant->startOfDay())) {
            return ['date' => null, 'jours' => null];
        }

        return [
            'date' => $date->toDateString(),
            'jours' => (int) $maintenant->startOfDay()->diffInDays($date->startOfDay()),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function seance(User $eleve, ProfilEleve $profil): array
    {
        $enCours = $this->seances->enCours($eleve);
        // Sinon, la première des séances préparées : ce que l'accueil annonce
        // est ce que « Commencer » ouvre, en ligne comme hors ligne (HL4).
        $prochaine = $enCours ?? $this->seances->aVenir($eleve, $profil)->first();
        $termineeAujourdhui = Seance::query()
            ->where('user_id', $eleve->id)
            ->whereDate('jour', CarbonImmutable::today())
            ->whereNotNull('termine_le')
            ->exists();

        $matieres = $prochaine === null ? [] : Question::query()
            ->with('notion.chapitre.matiere')
            ->whereKey($prochaine->questions)
            ->get()
            ->sortBy(fn (Question $question) => array_search($question->id, $prochaine->questions, true))
            ->map(fn (Question $question) => $question->notion->chapitre->matiere->teinte->value)
            ->unique()
            ->take(3)
            ->values()
            ->all();

        return [
            'en_cours' => $enCours?->uuid,
            'repondues' => $enCours !== null ? $enCours->tentatives()->distinct()->count('question_id') : 0,
            'questions' => $prochaine !== null ? count($prochaine->questions) : 0,
            'duree_minutes' => $profil->objectif_minutes,
            'matieres' => $matieres,
            'terminee_aujourdhui' => $termineeAujourdhui && $enCours === null,
        ];
    }

    /**
     * Mes réussites : combien de badges, les trois derniers obtenus, et le
     * prochain à gagner.
     *
     * @return array<string, mixed>
     */
    private function reussites(User $eleve): array
    {
        $badges = collect($this->motivation->badges($eleve->id));
        $obtenus = $badges->whereNotNull('obtenu_le')->sortByDesc('obtenu_le')->values();

        return [
            'obtenus' => $obtenus->count(),
            'total' => $badges->count(),
            'derniers' => $obtenus->take(3)->all(),
            'prochain' => $badges->firstWhere('obtenu_le', null),
        ];
    }

    /**
     * L'instantané de l'élève pour l'appareil (HL4, HORS_LIGNE.md A.10) :
     * la dernière jauge du serveur, la série confirmée et les trois
     * prochaines séances avec **les props mêmes** de leur écran, pour les
     * faire hors ligne. Lu après chaque synchronisation.
     *
     * @return array<string, mixed>
     */
    public function instantane(User $eleve, ProfilEleve $profil): array
    {
        return [
            'calcule_le' => CarbonImmutable::now()->toIso8601ZuluString('millisecond'),
            'jauge' => $this->maitrise->jauge($profil),
            'serie' => $this->motivation->serie($eleve->id),
            'seances' => $this->seances->aVenir($eleve, $profil)->map(fn (Seance $seance) => [
                'uuid' => $seance->uuid,
                'rang' => $seance->rang,
                'props' => $this->seances->props($seance),
            ])->values()->all(),
        ];
    }

    /**
     * Leçons commencées et pas encore comprises, les plus récentes d'abord ;
     * sinon, les premières leçons du programme à ouvrir.
     *
     * @param  Collection<int, Lecon>  $lecons
     * @param  Collection<int, ProgressionLecon>  $progressions
     * @return list<array<string, mixed>>
     */
    private function reprendre(Collection $lecons, Collection $progressions): array
    {
        $parId = $lecons->keyBy('id');

        $commencees = $progressions
            ->filter(fn (ProgressionLecon $progression) => $parId->has($progression->lecon_id)
                && $progression->etat !== EtatLecon::Comprise)
            ->sortByDesc(fn (ProgressionLecon $progression) => $progression->position_saisie_le ?? $progression->updated_at)
            ->map(fn (ProgressionLecon $progression) => [$parId->get($progression->lecon_id), $progression]);

        $aOuvrir = $lecons
            ->reject(fn (Lecon $lecon) => $progressions->has($lecon->id))
            ->sortBy([
                fn (Lecon $a, Lecon $b) => $a->notion->chapitre->ordre <=> $b->notion->chapitre->ordre,
                fn (Lecon $a, Lecon $b) => $a->notion->ordre <=> $b->notion->ordre,
            ])
            ->map(fn (Lecon $lecon) => [$lecon, null]);

        return array_values($commencees->concat($aOuvrir)->take(3)->map(function (array $paire) {
            /** @var Lecon $lecon */
            [$lecon, $progression] = $paire;
            $minutes = BlocsContenu::minutesDeLecture($lecon->versionPubliee->blocs ?? []);
            $position = $progression->position ?? 0;

            return [
                'uuid' => $lecon->uuid,
                'cle' => $lecon->notion->chapitre->matiere->teinte->value,
                'chapitre' => $lecon->notion->chapitre->titre,
                'lecon' => $lecon->versionPubliee->titre ?? $lecon->titre,
                'progression' => $position,
                'minutes_restantes' => max(1, (int) ceil($minutes * (100 - $position) / 100)),
                'etat' => $progression?->etat?->value,
            ];
        })->all());
    }

    /**
     * Les quatre premiers gestes, cochés quand ils sont faits.
     *
     * @param  Collection<int, ProgressionLecon>  $progressions
     * @return list<array{cle: string, fait: bool}>
     */
    private function premiersPas(User $eleve, Collection $progressions): array
    {
        return [
            ['cle' => 'profil', 'fait' => true],
            ['cle' => 'exercice', 'fait' => Tentative::query()->where('user_id', $eleve->id)->exists()],
            ['cle' => 'lecon', 'fait' => $progressions->isNotEmpty()],
            ['cle' => 'seance', 'fait' => Seance::query()->where('user_id', $eleve->id)->whereNotNull('termine_le')->exists()],
        ];
    }
}
