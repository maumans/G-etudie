<?php

namespace App\Http\Controllers\Eleve;

use App\Http\Controllers\Controller;
use App\Support\Demonstration\TableauDeBordExemple;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Accueil élève : le tableau de bord. Jusqu'aux lots 2 et 6, ses données
 * sont celles de démonstration (`est_exemple`), affichées avec le bandeau
 * « EXEMPLE — contenu fictif ».
 */
class AccueilController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('eleve/accueil', [
            'tableau' => TableauDeBordExemple::donnees(),
        ]);
    }
}
