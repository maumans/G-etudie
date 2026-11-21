<?php

namespace App\Http\Controllers\Vitrine;

use App\Http\Controllers\Controller;
use App\Models\Sujet;
use App\Support\AnnalesPubliques;
use Illuminate\Http\Response;

/**
 * `/sitemap.xml` (lot 8) : l'accueil, la liste des sujets et chaque sujet
 * **indexable** (AnnalesPubliques::indexables : jamais un sujet d'exemple,
 * jamais un sujet sans autorisation de publier).
 */
class PlanSiteController extends Controller
{
    public function __invoke(): Response
    {
        $adresses = [
            ['loc' => url('/'), 'lastmod' => null],
            ['loc' => route('vitrine.sujets.index'), 'lastmod' => null],
        ];

        AnnalesPubliques::indexables()->orderBy('id')->select(['id', 'slug', 'updated_at'])
            ->each(function (Sujet $sujet) use (&$adresses) {
                $adresses[] = ['loc' => route('vitrine.sujets.show', $sujet->slug), 'lastmod' => $sujet->updated_at->toDateString()];
            });

        $xml = '<?xml version="1.0" encoding="UTF-8"?>'."\n"
            .'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'."\n";

        foreach ($adresses as $adresse) {
            $xml .= '  <url><loc>'.e($adresse['loc']).'</loc>'
                .($adresse['lastmod'] !== null ? '<lastmod>'.$adresse['lastmod'].'</lastmod>' : '')
                .'</url>'."\n";
        }

        return response($xml.'</urlset>'."\n", 200, [
            'Content-Type' => 'application/xml; charset=UTF-8',
            'Cache-Control' => 'public, max-age=3600',
        ]);
    }
}
