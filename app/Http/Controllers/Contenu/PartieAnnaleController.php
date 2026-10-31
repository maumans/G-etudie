<?php

namespace App\Http\Controllers\Contenu;

use App\Enums\TypeQuestion;
use App\Http\Controllers\Controller;
use App\Models\Notion;
use App\Models\Question;
use App\Models\Sujet;
use App\Models\SujetPartie;
use App\Services\Annales\SujetService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

/**
 * La structure d'une annale en brouillon : parties (titre, barème imprimé,
 * consigne) et questions (ajout, retrait, ordre, « réponse vérifiée »).
 * Chaque geste passe par SujetService, qui revérifie sous verrou ; la
 * saisie d'une question se fait dans l'écran des questions.
 */
class PartieAnnaleController extends Controller
{
    public function __construct(private SujetService $sujets) {}

    public function store(Request $request, Sujet $sujet): RedirectResponse
    {
        Gate::authorize('rediger', $sujet);
        $donnees = $request->validate(['titre' => ['required', 'string', 'max:160']]);

        $this->sujets->ajouterPartie($sujet, $request->user(), $donnees['titre']);

        return to_route('contenu.annales.show', $sujet);
    }

    public function update(Request $request, SujetPartie $partie): RedirectResponse
    {
        Gate::authorize('rediger', $partie->sujet);

        $donnees = $request->validate([
            'titre' => ['required', 'string', 'max:160'],
            'bareme' => ['nullable', 'numeric', 'between:0,999'],
            'consigne' => ['required', 'array'],
        ]);

        $this->sujets->enregistrerPartie($partie, $request->user(), $donnees['titre'], isset($donnees['bareme']) ? (float) $donnees['bareme'] : null, $donnees['consigne']);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Partie enregistrée.']);

        return to_route('contenu.annales.show', $partie->sujet);
    }

    public function destroy(Request $request, SujetPartie $partie): RedirectResponse
    {
        Gate::authorize('rediger', $partie->sujet);
        $this->sujets->supprimerPartie($partie, $request->user());

        return to_route('contenu.annales.show', $partie->sujet);
    }

    public function ajouterQuestion(Request $request, SujetPartie $partie): RedirectResponse
    {
        Gate::authorize('rediger', $partie->sujet);

        $donnees = $request->validate([
            'notion_id' => ['required', 'integer', Rule::exists('notions', 'id')],
            'type' => ['required', Rule::enum(TypeQuestion::class)],
        ]);

        $question = $this->sujets->ajouterQuestion(
            $partie,
            $request->user(),
            Notion::query()->whereKey($donnees['notion_id'])->firstOrFail(),
            TypeQuestion::from($donnees['type']),
        );

        return to_route('contenu.questions.edit', $question);
    }

    public function retirerQuestion(Request $request, Question $question): RedirectResponse
    {
        $sujet = $this->sujetDe($question);
        Gate::authorize('rediger', $sujet);

        $this->sujets->retirerQuestion($question, $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Question retirée de l’annale.']);

        return to_route('contenu.annales.show', $sujet);
    }

    public function deplacerQuestion(Request $request, Question $question): RedirectResponse
    {
        $sujet = $this->sujetDe($question);
        Gate::authorize('rediger', $sujet);
        $donnees = $request->validate(['sens' => ['required', Rule::in(['monter', 'descendre'])]]);

        $this->sujets->deplacerQuestion($question, $request->user(), $donnees['sens'] === 'monter' ? -1 : 1);

        return to_route('contenu.annales.show', $sujet);
    }

    /** « J'ai vérifié la réponse et le corrigé proposés » : depuis l'annale ou l'écran de saisie. */
    public function verifierQuestion(Request $request, Question $question): RedirectResponse
    {
        Gate::authorize('rediger', $question);
        $this->sujets->verifierReponse($question, $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Réponse vérifiée.']);

        return $request->boolean('depuis_saisie')
            ? to_route('contenu.questions.edit', $question)
            : to_route('contenu.annales.show', $this->sujetDe($question));
    }

    private function sujetDe(Question $question): Sujet
    {
        $sujet = $question->partie?->sujet;
        abort_if($sujet === null, 404);

        return $sujet;
    }
}
