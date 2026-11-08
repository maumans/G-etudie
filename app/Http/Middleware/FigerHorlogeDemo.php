<?php

namespace App\Http\Middleware;

use App\Support\HorlogeDemo;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpFoundation\Response;

/**
 * Captures d'écran (développement seulement, `HorlogeDemo`) : avec le cookie
 * `horloge_demo=1`, la requête est traitée à l'instant du semis des données
 * de démonstration.
 *
 * Placé **après** l'ouverture de la session : la session est lue et
 * enregistrée à la vraie heure (sinon sa dernière activité reculerait et
 * elle expirerait pour les requêtes suivantes), seuls le contrôleur et la
 * réponse voient l'horloge figée.
 */
class FigerHorlogeDemo
{
    public function handle(Request $request, Closure $next): Response
    {
        $instant = HorlogeDemo::autorisee() && $request->cookies->get(HorlogeDemo::COOKIE) === '1'
            ? HorlogeDemo::instant()
            : null;

        if ($instant === null) {
            return $next($request);
        }

        $avant = Carbon::getTestNow();
        Carbon::setTestNow($instant);

        try {
            return $next($request);
        } finally {
            Carbon::setTestNow($avant);
        }
    }
}
