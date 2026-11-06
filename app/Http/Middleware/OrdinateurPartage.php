<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Ordinateur partagé d'une école (HL-D9, lot 7) : coché à la connexion, rien
 * n'est gardé. La session s'arrête à la fermeture du navigateur (au lieu des
 * 30 jours), aucun jeton de profil n'est remis (AppareilService), et
 * l'application ne range ni profil local, ni pack, ni copie d'écran (prop
 * partagée `appareil_partage`).
 *
 * Placé après StartSession : le cookie de session est écrit au retour, en
 * lisant `session.expire_on_close` à ce moment-là.
 */
class OrdinateurPartage
{
    public const CLE = 'ordinateur_partage';

    public function handle(Request $request, Closure $next): Response
    {
        if ($request->hasSession() && $request->session()->get(self::CLE) === true) {
            config(['session.expire_on_close' => true]);
        }

        return $next($request);
    }
}
