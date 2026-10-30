<?php

namespace App\Http\Controllers\Contenu\Referentiel;

use App\Http\Controllers\Controller;
use App\Models\Chapitre;
use App\Models\Classe;
use App\Models\Matiere;
use App\Models\Notion;
use App\Services\ReferentielService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Référentiel › Programme : chapitres et notions d'une matière pour une
 * classe d'examen. Le programme vient de l'équipe pédagogique (CLAUDE.md
 * § 5) : l'écran le fait saisir, il ne propose rien.
 */
class ProgrammeController extends Controller
{
    public function __construct(private ReferentielService $referentiel) {}

    public function index(Request $request): Response
    {
        $classes = Classe::query()->orderBy('ordre')->get(['id', 'nom']);
        $classe = $classes->firstWhere('id', $request->integer('classe')) ?? $classes->get(1) ?? $classes->first();

        $matieres = Matiere::query()
            ->withCount(['chapitres' => fn ($q) => $q->where('classe_id', $classe?->id)])
            ->orderBy('ordre')
            ->get();
        $matiere = $matieres->firstWhere('id', $request->integer('matiere')) ?? $matieres->first();

        $chapitres = $matiere === null || $classe === null ? collect() : Chapitre::query()
            ->where('matiere_id', $matiere->id)
            ->where('classe_id', $classe->id)
            ->with(['notions' => fn ($q) => $q->withCount('lecons')])
            ->orderBy('ordre')
            ->orderBy('id')
            ->get();

        return Inertia::render('contenu/referentiel/programme', [
            'classes' => $classes,
            'classe_id' => $classe?->id,
            'matieres' => $matieres->map(fn (Matiere $m) => [
                'id' => $m->id,
                'nom' => $m->nom,
                'teinte' => $m->teinte->value,
                'chapitres' => $m->chapitres_count,
            ]),
            'matiere_id' => $matiere?->id,
            'chapitres' => $chapitres->map(fn (Chapitre $c) => [
                'id' => $c->id,
                'titre' => $c->titre,
                'est_exemple' => $c->est_exemple,
                'notions' => $c->notions->map(fn (Notion $n) => [
                    'id' => $n->id,
                    'titre' => $n->titre,
                    'est_exemple' => $n->est_exemple,
                    'lecons' => $n->lecons_count,
                ]),
            ]),
        ]);
    }

    public function storeChapitre(Request $request): RedirectResponse
    {
        $donnees = $request->validate([
            'matiere_id' => ['required', 'integer', Rule::exists('matieres', 'id')],
            'classe_id' => ['required', 'integer', Rule::exists('classes', 'id')],
            'titre' => ['required', 'string', 'max:160'],
        ]);

        Chapitre::create([
            ...$donnees,
            'ordre' => $this->referentiel->rangSuivant(
                Chapitre::query()->where('matiere_id', $donnees['matiere_id'])->where('classe_id', $donnees['classe_id']),
            ),
        ]);

        return back();
    }

    public function updateChapitre(Request $request, Chapitre $chapitre): RedirectResponse
    {
        $chapitre->update($request->validate(['titre' => ['required', 'string', 'max:160']]));

        return back();
    }

    public function deplacerChapitre(Request $request, Chapitre $chapitre): RedirectResponse
    {
        $sens = $request->validate(['sens' => ['required', Rule::in([-1, 1])]])['sens'];

        $this->referentiel->deplacer(
            $chapitre,
            Chapitre::query()->where('matiere_id', $chapitre->matiere_id)->where('classe_id', $chapitre->classe_id),
            (int) $sens,
        );

        return back();
    }

    public function destroyChapitre(Chapitre $chapitre): RedirectResponse
    {
        $this->referentiel->supprimerChapitre($chapitre);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Chapitre supprimé.']);

        return back();
    }

    public function storeNotion(Request $request, Chapitre $chapitre): RedirectResponse
    {
        $donnees = $request->validate(['titre' => ['required', 'string', 'max:160']]);

        $chapitre->notions()->create([
            ...$donnees,
            'ordre' => $this->referentiel->rangSuivant(Notion::query()->where('chapitre_id', $chapitre->id)),
        ]);

        return back();
    }

    public function updateNotion(Request $request, Notion $notion): RedirectResponse
    {
        $notion->update($request->validate(['titre' => ['required', 'string', 'max:160']]));

        return back();
    }

    public function deplacerNotion(Request $request, Notion $notion): RedirectResponse
    {
        $sens = $request->validate(['sens' => ['required', Rule::in([-1, 1])]])['sens'];

        $this->referentiel->deplacer($notion, Notion::query()->where('chapitre_id', $notion->chapitre_id), (int) $sens);

        return back();
    }

    public function destroyNotion(Notion $notion): RedirectResponse
    {
        $this->referentiel->supprimerNotion($notion);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Notion supprimée.']);

        return back();
    }
}
