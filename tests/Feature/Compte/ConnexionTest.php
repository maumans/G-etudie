<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('l\'écran de connexion s\'affiche', function () {
    $this->get(route('login'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('auth/connexion'));
});

test('on se connecte avec son numéro, quelle que soit la façon de l\'écrire', function (string $saisie) {
    $user = User::factory()->create(['telephone' => '+224622123456']);

    $this->post(route('login.store'), ['telephone' => $saisie, 'password' => 'password'])
        ->assertRedirect(route('eleve.accueil', absolute: false));

    $this->assertAuthenticatedAs($user);
})->with(['622123456', '622 12 34 56', '+224 622 12 34 56', '00224622123456']);

test('un mauvais mot de passe ne connecte pas, avec un message en français', function () {
    User::factory()->create(['telephone' => '+224622123456']);

    $this->post(route('login.store'), ['telephone' => '622123456', 'password' => 'mauvais-mdp'])
        ->assertSessionHasErrors(['telephone' => 'Ces identifiants ne correspondent à aucun compte.']);

    $this->assertGuest();
});

test('un compte désactivé ne se connecte pas', function () {
    User::factory()->desactive()->create(['telephone' => '+224622123456']);

    $this->post(route('login.store'), ['telephone' => '622123456', 'password' => 'password']);

    $this->assertGuest();
});

test('la limitation compte les essais par numéro, même tapé de façons différentes', function () {
    User::factory()->create(['telephone' => '+224622123456']);
    $saisies = ['622123456', '622 12 34 56', '+224622123456', '00224 622 12 34 56', '6.22.12.34.56'];

    foreach ($saisies as $saisie) {
        $this->post(route('login.store'), ['telephone' => $saisie, 'password' => 'mauvais']);
    }

    $this->post(route('login.store'), ['telephone' => '622123456', 'password' => 'password'])
        ->assertTooManyRequests();

    $this->assertGuest();
});

test('on se déconnecte', function () {
    $this->actingAs(User::factory()->create())
        ->post(route('logout'))
        ->assertRedirect(route('home'));

    $this->assertGuest();
});

test('chaque page ne reçoit du compte que l\'identifiant, le prénom, le pseudo et l\'état du numéro', function () {
    $user = User::factory()->create(['prenom' => 'Ibrahima', 'pseudo' => 'ibra']);

    $this->actingAs($user)
        ->get(route('eleve.accueil'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('auth.user', [
                'id' => $user->id,
                'prenom' => 'Ibrahima',
                'pseudo' => 'ibra',
                'numero_verifie' => true,
            ]));
});
