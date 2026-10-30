<?php

namespace App\Http\Controllers\HorsLigne;

use App\Http\Controllers\Controller;
use Illuminate\Http\Response;

/**
 * Sert le service worker à /sw.js (HORS_LIGNE.md A.3.1) : route publique, en
 * JavaScript, autorisé sur tout le site, jamais mis en cache par le
 * navigateur (une nouvelle version doit être vue au prochain passage).
 *
 * Injecte en tête de resources/service-worker/sw.js : la version du build,
 * la liste de précache (manifeste Vite), la liste blanche des écrans, la page
 * de repli. Sous `npm run dev` (public/hot), sert un script qui se
 * désinstalle et vide ses caches — ⚠ un public/hot oublié fait croire qu'on
 * est en développement.
 */
class ServiceWorkerController extends Controller
{
    /** Extensions jamais précachées : les navigateurs visés prennent le WOFF2 (écart B.5 n° 3). */
    private const EXCLUES = ['.woff', '.ttf', '.map'];

    /**
     * Pages jamais ouvertes hors ligne (niveau C, A.2) : chargées en ligne
     * comme sur un site normal, pas téléchargées d'avance sur le forfait de
     * l'élève. Leurs fragments partagés avec d'autres pages restent précachés.
     */
    private const PAGES_EN_LIGNE = [
        'resources/js/pages/dev/',
        'resources/js/pages/vitrine/',
        'resources/js/pages/auth/',
        'resources/js/pages/contenu/',
        'resources/js/pages/console/',
    ];

    public function __invoke(): Response
    {
        $script = is_file(public_path('hot')) || ! is_file(self::manifeste())
            ? self::scriptDeDesinstallation()
            : self::constantes().file_get_contents(resource_path('service-worker/sw.js'));

        return response($script, 200, [
            'Content-Type' => 'application/javascript; charset=utf-8',
            'Service-Worker-Allowed' => '/',
            'Cache-Control' => 'no-cache',
        ]);
    }

    public static function manifeste(): string
    {
        return public_path('build/manifest.json');
    }

    /**
     * Les fichiers du build : JS, CSS et ressources (polices), sauf les formats
     * inutiles et les pages qui ne s'ouvrent qu'en ligne.
     *
     * @return list<string>
     */
    public static function precache(): array
    {
        /** @var array<string, array{file?: string, css?: list<string>, assets?: list<string>, src?: string}> $entrees */
        $entrees = json_decode((string) file_get_contents(self::manifeste()), true) ?: [];
        $fichiers = [];

        foreach ($entrees as $source => $entree) {
            if (array_filter(self::PAGES_EN_LIGNE, fn (string $prefixe) => str_starts_with($source, $prefixe))) {
                continue;
            }

            array_push($fichiers, ...array_filter([$entree['file'] ?? null]), ...($entree['css'] ?? []), ...($entree['assets'] ?? []));
        }

        $fichiers = array_filter(
            array_unique($fichiers),
            fn (string $fichier) => ! array_filter(self::EXCLUES, fn (string $ext) => str_ends_with($fichier, $ext)),
        );
        sort($fichiers);

        return array_map(fn (string $fichier) => '/build/'.$fichier, $fichiers);
    }

    public static function version(): string
    {
        return substr(hash_file('sha256', self::manifeste()) ?: '', 0, 16);
    }

    private static function constantes(): string
    {
        $constantes = [
            'VERSION' => self::version(),
            'PRECACHE' => self::precache(),
            'PAGES' => array_values(config('hors_ligne.pages')),
            'REPLI' => view('hors-ligne.repli')->render(),
            'DELAI_RESEAU_MS' => (int) config('hors_ligne.delai_reseau_ms'),
            'VERSIONS_GARDEES' => (int) config('hors_ligne.versions_gardees'),
        ];

        $lignes = array_map(
            fn (string $nom, mixed $valeur) => "const {$nom} = ".json_encode($valeur, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR).';',
            array_keys($constantes),
            $constantes,
        );

        return "/* Injecté par ServiceWorkerController */\n".implode("\n", $lignes)."\n\n";
    }

    private static function scriptDeDesinstallation(): string
    {
        return <<<'JS'
/* Développement (public/hot) : ce service worker se retire et vide ses caches. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (evenement) => {
    evenement.waitUntil((async () => {
        for (const nom of await caches.keys()) {
            await caches.delete(nom);
        }
        await self.registration.unregister();
    })());
});
JS;
    }
}
