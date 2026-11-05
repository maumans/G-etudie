<?php

namespace App\Http\Controllers\Eleve;

use App\Enums\EtatLecon;
use App\Http\Controllers\Controller;
use App\Models\Chapitre;
use App\Models\Epreuve;
use App\Models\Lecon;
use App\Models\Matiere;
use App\Models\Notion;
use App\Models\ProfilEleve;
use App\Models\ProgressionLecon;
use App\Services\MaitriseService;
use App\Support\BlocsContenu;
use App\Support\CatalogueEleve;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Cours côté élève (PLAN M4) : « Cours » (mes matières), puis une matière
 * (chapitres, notions, leçons). Ce que l'élève voit vient de
 * App\Support\CatalogueEleve ; une matière hors de son examen répond 404.
 */
class CoursController extends Controller
{
    public function index(Request $request, MaitriseService $maitrise): Response
    {
        $profil = $this->profil($request);
        $lecons = CatalogueEleve::lecons($profil)->with('notion.chapitre')->get();
        $progressions = $this->progressions($request);
        $jauge = collect($maitrise->jauge($profil)['matieres'])->keyBy('cle');

        return Inertia::render('eleve/cours', [
            'examen' => $profil->libelleExamen(),
            'est_exemple' => $lecons->contains('est_exemple', true),
            'matieres' => CatalogueEleve::epreuves($profil)->map(function (Epreuve $epreuve) use ($lecons, $progressions, $jauge, $profil) {
                $siennes = $lecons->filter(fn (Lecon $lecon) => $lecon->notion->chapitre->matiere_id === $epreuve->matiere_id);

                return [
                    'cle' => $epreuve->matiere->teinte->value,
                    'nom' => $epreuve->matiere->nom,
                    'slug' => $epreuve->matiere->slug,
                    'phare' => $epreuve->phare,
                    'chapitres' => CatalogueEleve::chapitres($profil, $epreuve->matiere)->count(),
                    'lecons' => $siennes->count(),
                    'lecons_comprises' => $siennes->filter(fn (Lecon $lecon) => $progressions->get($lecon->id)?->etat === EtatLecon::Comprise)->count(),
                    'maitrise' => $jauge->get($epreuve->matiere->teinte->value)['maitrise'] ?? 0,
                ];
            })->values(),
        ]);
    }

    /**
     * Une matière. `?faibles=1` (lot 6, depuis un segment de la jauge,
     * DESIGN.md § 6.1) : seulement les notions à revoir, fragiles ou en
     * cours — filtrées ici, pas dans la page.
     */
    public function matiere(Request $request, Matiere $matiere, MaitriseService $maitrise): Response
    {
        $profil = $this->profil($request);
        abort_unless(CatalogueEleve::voitMatiere($profil, $matiere), 404);

        $faibles = $request->boolean('faibles');
        $aujourdhui = CarbonImmutable::now();
        $maitrises = $maitrise->maitrises($request->user()->id);
        $evaluables = $maitrise->notionsEvaluables($profil)->keyBy('id');
        $etatDe = fn (Notion $notion): ?string => $evaluables->has($notion->id)
            ? MaitriseService::etat($maitrises->get($notion->id), $aujourdhui)
            : null;
        $estFaible = fn (Notion $notion): bool => in_array($etatDe($notion), ['a_revoir', 'fragile', 'en_cours'], true);
        $resume = $maitrise->parMatiere($profil)->firstWhere('matiere_id', $matiere->id);

        $lecons = CatalogueEleve::lecons($profil, $matiere)->with('versionPubliee')->get()->groupBy('notion_id');
        $progressions = $this->progressions($request);
        $chapitres = CatalogueEleve::chapitres($profil, $matiere)->with('notions')->orderBy('ordre')->get();

        return Inertia::render('eleve/matiere', [
            'matiere' => ['cle' => $matiere->teinte->value, 'nom' => $matiere->nom, 'slug' => $matiere->slug],
            'examen' => $profil->libelleExamen(),
            'est_exemple' => $lecons->flatten()->contains('est_exemple', true),
            'questions' => CatalogueEleve::questions($profil, $matiere)->count(),
            'maitrise' => $resume['maitrise'] ?? 0,
            'faibles' => $faibles,
            'chapitres' => $chapitres->map(fn (Chapitre $chapitre) => [
                'id' => $chapitre->id,
                'titre' => $chapitre->titre,
                'notions' => $chapitre->notions->filter(fn (Notion $notion) => ! $faibles || $estFaible($notion))->map(fn (Notion $notion) => [
                    'id' => $notion->id,
                    'titre' => $notion->titre,
                    'maitrise' => $maitrises->get($notion->id)?->score,
                    'etat' => $etatDe($notion),
                    'lecons' => ($lecons->get($notion->id) ?? collect())->map(fn (Lecon $lecon) => [
                        'uuid' => $lecon->uuid,
                        'titre' => $lecon->versionPubliee->titre ?? $lecon->titre,
                        'minutes' => BlocsContenu::minutesDeLecture($lecon->versionPubliee->blocs ?? []),
                        'etat' => $progressions->get($lecon->id)?->etat?->value,
                        'position' => $progressions->get($lecon->id)->position ?? 0,
                    ])->values()->all(),
                ])->values()->all(),
            ])->filter(fn (array $chapitre) => ! $faibles || $chapitre['notions'] !== [])->values()->all(),
        ]);
    }

    private function profil(Request $request): ProfilEleve
    {
        return CatalogueEleve::profil($request->user()) ?? abort(404);
    }

    /** @return Collection<int, ProgressionLecon> */
    private function progressions(Request $request): Collection
    {
        return ProgressionLecon::query()->where('user_id', $request->user()->id)->get()->keyBy('lecon_id');
    }
}
