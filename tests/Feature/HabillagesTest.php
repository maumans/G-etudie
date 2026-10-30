<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('la vitrine est ouverte aux visiteurs', function () {
    $this->get('/')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('vitrine/accueil'));
});

test('les espaces connectés renvoient un visiteur vers la connexion', function (string $adresse) {
    $this->get($adresse)->assertRedirect(route('login'));
})->with(['/eleve', '/contenu', '/console']);

test('un compte connecté atteint l\'entrée de chaque espace', function (string $adresse, string $composant) {
    $this->actingAs(User::factory()->create())
        ->get($adresse)
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component($composant));
})->with([
    ['/eleve', 'eleve/accueil'],
    ['/contenu', 'contenu/accueil'],
    ['/console', 'console/accueil'],
]);

test('après connexion, on arrive dans l\'espace élève', function () {
    expect(config('fortify.home'))->toBe('/eleve');
});
