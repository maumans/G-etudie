<?php

namespace App\Services;

use App\Enums\EtatLecon;
use App\Models\Lecon;
use App\Models\ProfilEleve;
use App\Models\ProgressionLecon;
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
 * (SeanceService), leçons visibles (CatalogueEleve). Ce service ne décide
 * rien lui-même ; il met en forme.
 */
class TableauDeBordEleveService
{
    /** Jours de la semaine, du lundi au dimanche. */
    private const JOURS = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];

    public function __construct(
        private MaitriseService $maitrise,
        private SeanceService $seances,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function donnees(User $eleve, ProfilEleve $profil, ?CarbonImmutable $maintenant = null): array
    {
        $maintenant ??= CarbonImmutable::now();
        $lecons = CatalogueEleve::lecons($profil)->with(['notion.chapitre.matiere', 'versionPubliee'])->get();
        $progressions = ProgressionLecon::query()->where('user_id', $eleve->id)->get()->keyBy('lecon_id');
        $epreuves = CatalogueEleve::epreuves($profil);

        return [
            'est_exemple' => $lecons->contains('est_exemple', true)
                || CatalogueEleve::questions($profil)->where('est_exemple', true)->exists(),
            'examen' => $profil->libelleExamen(),
            'compte_a_rebours' => $this->compteARebours($profil, $maintenant),
            'jauge' => $this->maitrise->jauge($profil),
            'seance' => $this->seance($eleve, $profil),
            'serie' => $this->serie($eleve, $maintenant),
            'progression' => $epreuves->map(function ($epreuve) use ($lecons, $progressions) {
                $sienne = $lecons->filter(fn (Lecon $lecon) => $lecon->notion->chapitre->matiere_id === $epreuve->matiere_id);

                return [
                    'cle' => $epreuve->matiere->teinte->value,
                    'slug' => $epreuve->matiere->slug,
                    'lecons' => $sienne->count(),
                    'lecons_comprises' => $sienne->filter(
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
        $disponibles = CatalogueEleve::questions($profil)->count();
        $termineeAujourdhui = Seance::query()
            ->where('user_id', $eleve->id)
            ->whereDate('jour', CarbonImmutable::today())
            ->whereNotNull('termine_le')
            ->exists();

        $matieres = CatalogueEleve::questions($profil)
            ->with('notion.chapitre.matiere')
            ->when($enCours !== null, fn ($requete) => $requete->whereKey($enCours->questions))
            ->get()
            ->map(fn ($question) => $question->notion->chapitre->matiere->teinte->value)
            ->unique()
            ->take(3)
            ->values()
            ->all();

        return [
            'en_cours' => $enCours?->uuid,
            'repondues' => $enCours !== null ? $enCours->tentatives()->distinct()->count('question_id') : 0,
            'questions' => $enCours !== null
                ? count($enCours->questions)
                : min($disponibles, SeanceService::nombreDeQuestions($profil->objectif_minutes)),
            'duree_minutes' => $profil->objectif_minutes,
            'matieres' => $matieres,
            'terminee_aujourdhui' => $termineeAujourdhui && $enCours === null,
        ];
    }

    /**
     * Série de jours : un jour compte dès qu'il y a eu une réponse ou une
     * leçon ouverte (au jour du geste, `saisi_le`, A.6). Points, jour de
     * grâce et objectif atteint arrivent avec la motivation (lot 6).
     *
     * @return array<string, mixed>
     */
    private function serie(User $eleve, CarbonImmutable $maintenant): array
    {
        $depuis = $maintenant->startOfDay()->subDays(60);
        $jours = Tentative::query()->where('user_id', $eleve->id)->where('saisi_le', '>=', $depuis)->pluck('saisi_le')
            ->concat(ProgressionLecon::query()->where('user_id', $eleve->id)->where('position_saisie_le', '>=', $depuis)->pluck('position_saisie_le'))
            ->map(fn ($moment) => CarbonImmutable::parse($moment)->toDateString())
            ->unique()
            ->flip();

        $aujourdhui = $maintenant->startOfDay();
        $suite = 0;
        $jour = $jours->has($aujourdhui->toDateString()) ? $aujourdhui : $aujourdhui->subDay();

        while ($jours->has($jour->toDateString())) {
            $suite++;
            $jour = $jour->subDay();
        }

        $lundi = $aujourdhui->startOfWeek();
        $semaine = [];

        foreach (self::JOURS as $rang => $nom) {
            $date = $lundi->addDays($rang);
            $semaine[] = [
                'jour' => $nom,
                'etat' => match (true) {
                    $jours->has($date->toDateString()) => 'fait',
                    $date->equalTo($aujourdhui) => 'en_cours',
                    $date->greaterThan($aujourdhui) => 'a_venir',
                    default => 'manque',
                },
            ];
        }

        return [
            'jours' => $suite,
            'reponses_semaine' => Tentative::query()->where('user_id', $eleve->id)->where('saisi_le', '>=', $lundi)->count(),
            'semaine' => $semaine,
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
