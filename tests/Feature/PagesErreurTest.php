<?php

use Illuminate\Support\Facades\Route;
use Inertia\Testing\AssertableInertia as Assert;

test('une adresse inconnue affiche la page d\'erreur 404 en français', function () {
    $this->get('/adresse-qui-n-existe-pas')
        ->assertNotFound()
        ->assertInertia(fn (Assert $page) => $page
            ->component('erreur')
            ->where('statut', 404));
});

test('un accès refusé affiche la page d\'erreur 403', function () {
    Route::middleware('web')->get('/test/interdit', fn () => abort(403));

    $this->get('/test/interdit')
        ->assertForbidden()
        ->assertInertia(fn (Assert $page) => $page->component('erreur')->where('statut', 403));
});

test('une erreur serveur affiche la page 500 quand le débogage est coupé', function () {
    config(['app.debug' => false]);
    Route::middleware('web')->get('/test/panne', fn () => throw new RuntimeException('panne'));

    $this->get('/test/panne')
        ->assertServerError()
        ->assertInertia(fn (Assert $page) => $page->component('erreur')->where('statut', 500));
});

test('une erreur serveur garde la page de débogage quand le débogage est actif', function () {
    config(['app.debug' => true]);
    Route::middleware('web')->get('/test/panne', fn () => throw new RuntimeException('panne'));

    $reponse = $this->get('/test/panne');

    $reponse->assertServerError();
    expect($reponse->headers->get('X-Inertia'))->toBeNull();
    expect($reponse->getContent())->not->toContain('"component":"erreur"');
});

test('une erreur de validation n\'est pas transformée en page d\'erreur', function () {
    Route::middleware('web')->post('/test/validation', function () {
        request()->validate(['prenom' => 'required']);
    });

    $this->from('/dev/composants')
        ->post('/test/validation')
        ->assertRedirect('/dev/composants')
        ->assertSessionHasErrors(['prenom' => 'Le champ prénom est obligatoire.']);
});
