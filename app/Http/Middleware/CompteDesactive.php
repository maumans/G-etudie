<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Lot 13 : un compte désactivé pendant qu'il était connecté est déconnecté
 * à sa requête suivante. ComptesService ferme déjà ses sessions en base ;
 * ce filet couvre une session gardée ailleurs (autre pilote de session,
 * cookie « se souvenir de moi » rejoué).
 */
class CompteDesactive
{
    public function handle(Request $request, Closure $next): Response
    {
        // La synchronisation décide elle-même, geste par geste : un geste
        // fait hors ligne avant la désactivation est accepté, celui d'après
        // refusé (SynchroService, HORS_LIGNE.md A.6). Une règle, une
        // autorité : ce filet ne la double pas.
        if ($request->is('sync/*')) {
            return $next($request);
        }

        $user = $request->user();

        if ($user !== null && $user->estDesactive()) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('login')->with('status', 'Ce compte est désactivé. Pour le rouvrir, contacte l’administrateur de la plateforme.');
        }

        return $next($request);
    }
}
