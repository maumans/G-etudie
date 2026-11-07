<?php

namespace App\Ssr;

use App\Support\Habillages;
use Illuminate\Http\Request;
use Inertia\Ssr\HttpGateway;
use Inertia\Ssr\Response;

/**
 * Rendu serveur réservé à la vitrine (lot 8) : la règle est
 * `Habillages::renduServeur`. Toute autre page part sans rendu serveur —
 * aucun appel au processus Node — et le navigateur la construit comme avant.
 *
 * Si le processus Node est absent ou échoue, la passerelle d'Inertia renvoie
 * `null` : la vitrine est alors construite par le navigateur, sans erreur
 * pour le visiteur (plus lente seulement).
 */
class PasserelleVitrine extends HttpGateway
{
    /**
     * @param  array<string, mixed>  $page
     */
    public function dispatch(array $page, ?Request $request = null): ?Response
    {
        $composant = $page['component'] ?? null;

        if (! is_string($composant) || ! Habillages::renduServeur($composant)) {
            return null;
        }

        return parent::dispatch($page, $request);
    }
}
