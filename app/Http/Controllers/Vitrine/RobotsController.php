<?php

namespace App\Http\Controllers\Vitrine;

use App\Http\Controllers\Controller;
use App\Support\Seo;
use Illuminate\Http\Response;

/**
 * `/robots.txt` (lot 8), servi par Laravel et non plus en fichier : il doit
 * donner l'adresse **absolue** du plan du site, propre au domaine (D11).
 * Les espaces connectés sont fermés aux moteurs (ils redirigent de toute
 * façon vers la connexion) ; la vitrine, les annales publiques et leurs
 * images de partage sont ouvertes. `VITRINE_INDEXER=false` (préproduction)
 * ferme tout (Seo::indexationPermise, même règle que la balise robots).
 */
class RobotsController extends Controller
{
    /** Préfixes que les moteurs n'ont pas à parcourir. */
    public const FERMES = ['/eleve', '/contenu', '/console', '/compte', '/accueil', '/sync', '/appareil', '/documents', '/dev'];

    public function __invoke(): Response
    {
        $lignes = ['User-agent: *'];

        if (Seo::indexationPermise()) {
            foreach (self::FERMES as $prefixe) {
                $lignes[] = "Disallow: {$prefixe}";
            }
        } else {
            $lignes[] = 'Disallow: /';
        }

        $lignes[] = '';
        $lignes[] = 'Sitemap: '.route('plan-site');

        return response(implode("\n", $lignes)."\n", 200, [
            'Content-Type' => 'text/plain; charset=UTF-8',
            'Cache-Control' => 'public, max-age=3600',
        ]);
    }
}
