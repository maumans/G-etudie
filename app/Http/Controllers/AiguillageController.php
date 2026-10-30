<?php

namespace App\Http\Controllers;

use App\Enums\Espace;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * `/accueil` (fortify.home) : après connexion, après la double
 * authentification ou depuis une page d'invité, chaque compte est envoyé dans
 * son espace. Une seule réponse à « où arrive ce compte ? » : Espace::accueilDe().
 */
class AiguillageController extends Controller
{
    public function __invoke(Request $request): RedirectResponse
    {
        return redirect(Espace::accueilDe($request->user()));
    }
}
