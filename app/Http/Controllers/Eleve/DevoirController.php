<?php

namespace App\Http\Controllers\Eleve;

use App\Http\Controllers\Controller;
use App\Models\Devoir;
use App\Services\Organisation\DevoirService;
use App\Services\Organisation\GesteRefuse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

/**
 * « Faire le devoir » (lot 11) : crée (une fois) la séance du devoir et
 * l'ouvre dans l'écran de séance, comme une séance du jour. Les réponses et
 * la fin passent par la file d'opérations (HORS_LIGNE.md A.6).
 */
class DevoirController extends Controller
{
    public function commencer(Request $request, Devoir $devoir, DevoirService $devoirs): RedirectResponse
    {
        Gate::authorize('faire', $devoir);

        try {
            $seance = $devoirs->commencer($request->user(), $devoir);
        } catch (GesteRefuse $refus) {
            Inertia::flash('toast', ['type' => 'error', 'message' => $refus->getMessage()]);

            return to_route('eleve.groupes.index');
        }

        return to_route('eleve.seances.show', $seance);
    }
}
