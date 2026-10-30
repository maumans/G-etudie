<?php

use App\Enums\Role;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('la vitrine est ouverte aux visiteurs', function () {
    $this->get('/')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('vitrine/accueil'));
});

test('les espaces connectés renvoient un visiteur vers la connexion', function (string $adresse) {
    $this->get($adresse)->assertRedirect(route('login'));
})->with(['/eleve', '/contenu', '/console', '/accueil']);

test('chaque espace s\'ouvre au rôle qui y travaille', function (Role $role, string $adresse, string $composant) {
    $this->actingAs(User::factory()->avecRole($role)->create())
        ->get($adresse)
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component($composant));
})->with([
    [Role::Eleve, '/eleve', 'eleve/accueil'],
    [Role::Redacteur, '/contenu', 'contenu/accueil'],
    [Role::Superadmin, '/console', 'console/accueil'],
]);

test('« Mon compte » prend l\'habillage de l\'espace du compte', function (Role $role, ?string $espace) {
    $this->actingAs(User::factory()->avecRole($role)->create())
        ->get(route('compte.profil.edit'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('compte/profil')
            ->where('auth.user.espace', $espace));
})->with([
    [Role::Eleve, 'eleve'],
    [Role::Relecteur, 'contenu'],
    [Role::Superadmin, 'console'],
    [Role::Parent, null],
]);

test('après connexion, on passe par l\'aiguillage', function () {
    expect(config('fortify.home'))->toBe('/accueil');
});
