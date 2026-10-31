<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Espace élève : sans profil d'examen, rien à montrer (ni matières, ni
 * leçons, ni séance) ; l'élève passe d'abord par le parcours d'accueil.
 */
class ProfilEleveRequis
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()?->profilEleve()->doesntExist()) {
            return to_route('eleve.bienvenue');
        }

        return $next($request);
    }
}
