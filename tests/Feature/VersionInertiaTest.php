<?php

use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;

/*
 * Un dossier public jetable : le vrai public/hot n'est jamais touché (un
 * fichier hot oublié ferait croire au service worker qu'on est en
 * développement).
 */
beforeEach(function () {
    $this->dossierPublic = storage_path('framework/testing/public-'.uniqid());
    File::ensureDirectoryExists($this->dossierPublic.'/build');
    File::put($this->dossierPublic.'/build/manifest.json', '{"resources/js/app.tsx":{"file":"assets/app-abc.js"}}');
    app()->usePublicPath($this->dossierPublic);
});

afterEach(function () {
    File::deleteDirectory($this->dossierPublic);
});

test('la version suit le manifeste du build', function () {
    $version = (new HandleInertiaRequests)->version(Request::create('/'));

    expect($version)->toBe(hash_file('xxh128', $this->dossierPublic.'/build/manifest.json'));
});

test('sous npm run dev (public/hot), il n\'y a pas de version : pas de 409 en pleine navigation', function () {
    File::put($this->dossierPublic.'/hot', 'http://localhost:5173');

    expect((new HandleInertiaRequests)->version(Request::create('/')))->toBeNull();
});

test('une visite Inertia porteuse d\'une ancienne version reçoit un 409 hors développement', function () {
    $this->get('/dev/composants', [
        'X-Inertia' => 'true',
        'X-Inertia-Version' => 'ancienne-version',
    ])->assertStatus(409);
});
