<?php

namespace App\Http\Controllers\Eleve;

use App\Http\Controllers\Controller;
use App\Services\SignalementService;
use App\Services\TableauDeBordEleveService;
use App\Support\CatalogueEleve;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Accueil élève : le tableau de bord (DESIGN.md § 6.0), avec les vraies
 * données de l'élève depuis le lot 2. Sans profil d'examen, l'élève passe
 * d'abord par le parcours d'accueil.
 */
class AccueilController extends Controller
{
    public function __invoke(Request $request, TableauDeBordEleveService $tableau): Response|RedirectResponse
    {
        $profil = CatalogueEleve::profil($request->user());

        if ($profil === null) {
            return to_route('eleve.bienvenue');
        }

        return Inertia::render('eleve/accueil', [
            'tableau' => $tableau->donnees($request->user(), $profil),
            // Lot 4 : l'équipe a répondu à un signalement (« Mes signalements »).
            'reponses_signalements' => SignalementService::reponsesNonLues($request->user()),
        ]);
    }
}
