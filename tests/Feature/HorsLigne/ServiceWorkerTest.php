<?php

use Illuminate\Support\Facades\File;

/**
 * Un dossier public jetable, avec un faux manifeste Vite : le test ne dépend
 * pas d'un `npm run build`.
 */
beforeEach(function () {
    $this->public = storage_path('framework/testing/public-sw');
    File::deleteDirectory($this->public);
    File::ensureDirectoryExists($this->public.'/build');
    File::put($this->public.'/build/manifest.json', json_encode([
        'resources/js/app.tsx' => ['file' => 'assets/app-1.js', 'css' => ['assets/app-2.css'], 'assets' => ['assets/police-3.woff2', 'assets/police-3.woff']],
        'resources/js/pages/eleve/accueil.tsx' => ['file' => 'assets/accueil-4.js', 'imports' => ['_partage-5.js']],
        '_partage-5.js' => ['file' => 'assets/partage-5.js'],
        'resources/js/pages/vitrine/accueil.tsx' => ['file' => 'assets/vitrine-6.js'],
        'resources/js/pages/dev/composants.tsx' => ['file' => 'assets/composants-7.js'],
        'resources/js/pages/console/accueil.tsx' => ['file' => 'assets/console-8.js'],
    ]));
    $this->app->usePublicPath($this->public);
});

afterEach(fn () => File::deleteDirectory($this->public));

test('/sw.js est servi sans connexion, avec les bons en-têtes', function () {
    $reponse = $this->get('/sw.js')->assertOk();

    expect($reponse->headers->get('Content-Type'))->toContain('application/javascript')
        ->and($reponse->headers->get('Service-Worker-Allowed'))->toBe('/')
        ->and($reponse->headers->get('Cache-Control'))->toContain('no-cache');
});

test('la liste de précache vient du manifeste Vite, sans WOFF ni pages en ligne', function () {
    $script = $this->get('/sw.js')->getContent();

    preg_match('/^const PRECACHE = (.+);$/m', $script, $trouve);

    expect(json_decode($trouve[1], true))->toBe([
        '/build/assets/accueil-4.js',
        '/build/assets/app-1.js',
        '/build/assets/app-2.css',
        '/build/assets/partage-5.js',
        '/build/assets/police-3.woff2',
    ]);
});

test('le script porte la version du build, la liste blanche et la page de repli', function () {
    $script = $this->get('/sw.js')->getContent();

    expect($script)->toContain('const VERSION = "'.substr(hash_file('sha256', $this->public.'/build/manifest.json'), 0, 16).'"')
        ->toContain('const PAGES = '.json_encode(config('hors_ligne.pages'), JSON_UNESCAPED_SLASHES))
        ->toContain('Cet écran demande une connexion')
        ->toContain("addEventListener('fetch'");
});

test('une nouvelle version du build change la version du script', function () {
    $avant = $this->get('/sw.js')->getContent();
    File::append($this->public.'/build/manifest.json', ' ');

    expect($this->get('/sw.js')->getContent())->not->toBe($avant);
});

test('sous npm run dev (public/hot), le script se désinstalle et vide ses caches', function () {
    File::put($this->public.'/hot', 'http://localhost:5173');

    $script = $this->get('/sw.js')->assertOk()->getContent();

    expect($script)->toContain('unregister()')
        ->toContain('caches.delete')
        ->not->toContain('PRECACHE');
});
