<?php

namespace App\Http\Controllers\Eleve;

use App\Enums\EtatLecon;
use App\Http\Controllers\Controller;
use App\Models\Epreuve;
use App\Models\Lecon;
use App\Models\Matiere;
use App\Models\Notion;
use App\Models\Pack;
use App\Models\ProfilEleve;
use App\Models\ProgressionLecon;
use App\Models\Sujet;
use App\Services\MaitriseService;
use App\Support\CatalogueEleve;
use App\Support\PresentationCours;
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

        $progressions = $this->progressions($request);

        return Inertia::render('eleve/matiere', [
            ...self::structure($profil, $matiere),
            'maitrise' => $resume['maitrise'] ?? 0,
            'faibles' => $faibles,
            'chapitres' => PresentationCours::chapitres(
                $profil,
                $matiere,
                notionPerso: fn (Notion $notion): array => ['maitrise' => $maitrises->get($notion->id)?->score, 'etat' => $etatDe($notion)],
                leconPerso: fn (Lecon $lecon): array => [
                    'etat' => $progressions->get($lecon->id)?->etat?->value,
                    'position' => $progressions->get($lecon->id)->position ?? 0,
                ],
                garderNotion: $faibles ? $estFaible : null,
            ),
        ]);
    }

    /**
     * Ce que l'écran d'une matière montre sans rien de personnel : la route
     * et le pack (PackService) le prennent ici (HORS_LIGNE.md A.4).
     *
     * @return array<string, mixed>
     */
    public static function structure(ProfilEleve $profil, Matiere $matiere): array
    {
        $sujets = CatalogueEleve::sujets($profil, $matiere)->orderByDesc('session')->get(['uuid', 'titre', 'session', 'type', 'est_exemple', 'examen_id', 'serie_id', 'matiere_id']);
        $pack = Pack::query()
            ->where('examen_id', $profil->examen_id)
            ->where('serie_id', $profil->serie_id)
            ->where('filiere', $profil->filiere->value)
            ->where('matiere_id', $matiere->id)
            ->whereNotNull('version')
            ->first();

        return [
            'matiere' => PresentationCours::matiere($matiere),
            'examen' => $profil->libelleExamen(),
            'est_exemple' => CatalogueEleve::lecons($profil, $matiere)->where('est_exemple', true)->exists(),
            'questions' => CatalogueEleve::questions($profil, $matiere)->count(),
            'maitrise' => 0,
            'faibles' => false,
            'chapitres' => PresentationCours::chapitres($profil, $matiere),
            // Lot 7 : les annales de la matière, ouvrables depuis le pack.
            'annales' => $sujets->map(fn (Sujet $sujet) => [
                'uuid' => $sujet->uuid,
                'titre' => $sujet->titre,
                'session' => $sujet->session,
                'est_exemple' => $sujet->est_exemple,
            ])->values()->all(),
            'pack' => $pack === null ? null : ['cle' => $pack->cle, 'taille_octets' => $pack->taille_octets],
        ];
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
