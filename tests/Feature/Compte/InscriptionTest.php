<?php

use App\Models\EntreeJournalAcces;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

$donnees = fn (array $autres = []): array => [
    'prenom' => 'Mariama',
    'pseudo' => 'mariama_bepc',
    'telephone' => '622 12 34 56',
    'password' => 'kankan2027',
    ...$autres,
];

test('l\'écran d\'inscription s\'affiche', function () {
    $this->get(route('register'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('auth/inscription'));
});

test('on s\'inscrit avec prénom, pseudo, téléphone et mot de passe, puis on est invité à vérifier son numéro', function () use ($donnees) {
    $this->post(route('register.store'), $donnees())
        ->assertRedirect(route('compte.verification.edit'));

    $user = User::sole();
    expect($user->telephone)->toBe('+224622123456')
        ->and($user->prenom)->toBe('Mariama')
        ->and($user->pseudo)->toBe('mariama_bepc')
        ->and($user->telephone_verifie_le)->toBeNull()
        ->and($user->email)->toBeNull()
        ->and(password_verify('kankan2027', $user->password))->toBeTrue();

    $this->assertAuthenticatedAs($user);
    expect(EntreeJournalAcces::where('action', 'compte.cree')->where('cible_id', $user->id)->exists())->toBeTrue();
});

test('un numéro déjà inscrit est refusé, quelle que soit la façon de l\'écrire', function () use ($donnees) {
    User::factory()->create(['telephone' => '+224622123456']);

    $this->post(route('register.store'), $donnees(['telephone' => '+224 622-12-34-56']))
        ->assertSessionHasErrors(['telephone' => 'Ce numéro de téléphone est déjà utilisé.']);

    expect(User::count())->toBe(1);
});

test('un numéro qui n\'est pas un mobile guinéen est refusé', function (string $numero) use ($donnees) {
    $this->post(route('register.store'), $donnees(['telephone' => $numero]))
        ->assertSessionHasErrors('telephone');

    $this->assertGuest();
})->with(['62212345', '322123456', '+33 6 12 34 56 78']);

test('un pseudo déjà pris est refusé', function () use ($donnees) {
    User::factory()->create(['pseudo' => 'mariama_bepc']);

    $this->post(route('register.store'), $donnees())->assertSessionHasErrors('pseudo');
});

test('un mot de passe de moins de 8 caractères est refusé', function () use ($donnees) {
    $this->post(route('register.store'), $donnees(['password' => 'court12']))
        ->assertSessionHasErrors(['password' => 'Le champ mot de passe doit contenir au moins 8 caractères.']);
});

test('un mot de passe simple de 8 caractères suffit (D3 : pas de règle de complexité)', function () use ($donnees) {
    $this->post(route('register.store'), $donnees(['password' => 'abcdefgh']))
        ->assertSessionHasNoErrors();
});

/* ---------- Profil : élève ou parent (2026-11-25) ---------- */

test('sans profil choisi, l\'inscription ouvre un compte élève', function () use ($donnees) {
    $this->post(route('register.store'), $donnees())->assertRedirect();

    expect(User::sole()->getRoleNames()->all())->toBe(['eleve']);
});

test('un parent ouvre son compte seul, arrive dans son espace et y suit son enfant par code', function () use ($donnees) {
    $this->post(route('register.store'), $donnees(['profil' => 'parent', 'pseudo' => 'papa_mariama']))
        ->assertRedirect(route('compte.verification.edit'));

    $parent = User::sole();
    expect($parent->getRoleNames()->all())->toBe(['parent'])
        ->and(EntreeJournalAcces::query()->where('action', 'compte.cree')->sole()->details)->toBe(['profil' => 'parent']);

    // L'aiguillage l'envoie dans l'espace parent, vide, avec la saisie du code.
    $this->get('/accueil')->assertRedirect('/parent');
    $this->get('/parent')->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('parent/accueil')->has('enfants', 0));
    // Et jamais dans l'espace élève.
    $this->get('/eleve')->assertForbidden();
});

test('on ne s\'inscrit ni enseignant, ni administrateur, ni avec un profil inventé', function (string $profil) use ($donnees) {
    $this->post(route('register.store'), $donnees(['profil' => $profil]))
        ->assertSessionHasErrors('profil');

    expect(User::query()->count())->toBe(0);
})->with(['enseignant', 'superadmin', 'admin_contenu', 'gestionnaire_etablissement', 'inconnu']);
