<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Session du personnel (back-office, console) : 12 h après la connexion, même
 * en pleine activité, puis on se reconnecte (HL-D10). Les élèves et les
 * parents gardent leurs 30 jours glissants (SESSION_LIFETIME).
 *
 * « Se souvenir de moi » ne vaut pas pour le personnel : une reconnexion par
 * le cookie de rappel est refusée, sinon il prolongerait la session sans fin.
 */
class SessionCourtePersonnel
{
    public const CLE = 'connexion_le';

    public const DUREE_SECONDES = 12 * 3600;

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user === null || ! $user->estPersonnel()) {
            return $next($request);
        }

        $session = $request->session();
        $debut = $session->get(self::CLE);

        // Session ouverte avant ce garde-fou : le décompte commence maintenant.
        if (! is_int($debut)) {
            $session->put(self::CLE, $debut = now()->getTimestamp());
        }

        $expiree = now()->getTimestamp() - $debut >= self::DUREE_SECONDES;

        if (! Auth::guard('web')->viaRemember() && ! $expiree) {
            return $next($request);
        }

        Auth::guard('web')->logout();
        $session->invalidate();
        $session->regenerateToken();

        return redirect()->route('login')->with(
            'status',
            'Session terminée : par sécurité, les comptes du personnel se reconnectent toutes les 12 heures.',
        );
    }
}
