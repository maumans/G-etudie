<?php

namespace App\Http\Controllers\Eleve;

use App\Http\Controllers\Controller;
use App\Models\Chapitre;
use App\Services\CultureService;
use App\Services\Organisation\GesteRefuse;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * « Culture générale » (lot 12, PLAN M10) : la question du jour, les thèmes
 * (Guinée, Afrique, Monde…), les quiz. Niveau B : l'écran se relit d'après
 * sa copie (config/hors_ligne.php) ; la question du jour et un quiz préparé
 * viennent de l'instantané (HL4) ; les réponses passent par la file.
 */
class CultureController extends Controller
{
    public function __construct(private CultureService $culture) {}

    public function index(Request $request): Response
    {
        $eleve = $request->user();
        $aujourdhui = CarbonImmutable::today();
        $themes = $this->culture->themes($eleve);
        $jour = $this->culture->etatDuJour($eleve, $aujourdhui);

        return Inertia::render('eleve/culture', [
            'jour' => $jour,
            'themes' => $themes,
            'historique' => $this->culture->historique($eleve),
            'est_exemple' => ($jour['question']['est_exemple'] ?? false) || collect($themes)->contains('est_exemple', true),
            'prenom' => $eleve->prenom,
            'aujourdhui' => $aujourdhui->toDateString(),
        ]);
    }

    public function lancer(Request $request): RedirectResponse
    {
        $donnees = $request->validate(['theme' => ['nullable', 'integer']]);
        $theme = isset($donnees['theme']) ? Chapitre::query()->find((int) $donnees['theme']) : null;

        if (isset($donnees['theme']) && $theme === null) {
            abort(404);
        }

        try {
            $seance = $this->culture->lancer($request->user(), $theme);
        } catch (GesteRefuse $refus) {
            Inertia::flash('toast', ['type' => 'error', 'message' => $refus->getMessage()]);

            return to_route('eleve.culture');
        }

        return to_route('eleve.seances.show', $seance);
    }
}
