<?php

namespace App\Ssr;

use App\Support\Habillages;
use Illuminate\Foundation\Vite;
use Illuminate\Support\Facades\Vite as ViteFacade;
use Inertia\Ssr\SsrState;

/**
 * Scripts lancés après l'affichage (lot 8, `app.blade.php`), pour une page
 * **effectivement** construite par le serveur : elle se lit et ses liens
 * marchent sans JavaScript, la bande passante va d'abord à ce que le
 * visiteur voit (styles, police, illustration), puis React hydrate.
 *
 * Sans rendu serveur (processus Node arrêté, en panne, trop lent), la page
 * est vide jusqu'au JavaScript : ses scripts partent alors tout de suite,
 * comme avant. En développement (`public/hot`), rien n'est différé.
 */
class ScriptsDifferes
{
    public static function actifs(string $page): bool
    {
        return Habillages::renduServeur($page)
            && ! ViteFacade::isRunningHot()
            // Le résultat est gardé par Inertia : `<x-inertia::app>` le
            // réutilise, le processus Node n'est appelé qu'une fois.
            && app(SsrState::class)->dispatch() !== null;
    }

    /**
     * Les balises (`modulepreload` et `script`) de la page, sans la feuille
     * de style. Une **copie** de Vite les produit : celui de l'application
     * ne les note pas parmi ses préchargements, et l'en-tête `Link`
     * (AddLinkHeadersForPreloadedAssets) ne les annonce pas — sinon le
     * navigateur les téléchargerait avant l'illustration.
     */
    public static function balises(string $page): string
    {
        $scripts = array_values(array_diff(Habillages::fichiersVite($page), ['resources/css/app.css']));

        return (clone app(Vite::class))($scripts)->toHtml();
    }
}
