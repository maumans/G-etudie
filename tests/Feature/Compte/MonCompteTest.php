<?php

use App\Models\EntreeJournalAcces;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->sms = smsEnMemoire();
    $this->user = User::factory()->create([
        'telephone' => '+224622123456',
        'prenom' => 'Fatoumata',
        'pseudo' => 'fatou',
    ]);
});

test('les écrans de « Mon compte » s\'affichent, et le compte n\'est pas ouvert aux visiteurs', function (string $route, string $composant) {
    $this->actingAs($this->user)->get(route($route))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component($composant));

    auth()->logout();
    $this->get(route($route))->assertRedirect(route('login'));
})->with([
    ['compte.profil.edit', 'compte/profil'],
    ['compte.mot-de-passe.edit', 'compte/mot-de-passe'],
    ['compte.numero.edit', 'compte/numero'],
    ['compte.affichage.edit', 'compte/affichage'],
]);

test('on change son prénom et son pseudo', function () {
    $this->actingAs($this->user)
        ->patch(route('compte.profil.update'), ['prenom' => 'Fanta', 'pseudo' => 'fanta_se'])
        ->assertRedirect(route('compte.profil.edit'));

    $user = $this->user->fresh();
    expect($user->prenom)->toBe('Fanta')->and($user->pseudo)->toBe('fanta_se');
});

test('on garde son propre pseudo, mais pas celui d\'un autre', function () {
    User::factory()->create(['pseudo' => 'pris']);

    $this->actingAs($this->user)
        ->patch(route('compte.profil.update'), ['prenom' => 'Fatoumata', 'pseudo' => 'fatou'])
        ->assertSessionHasNoErrors();

    $this->actingAs($this->user)
        ->patch(route('compte.profil.update'), ['prenom' => 'Fatoumata', 'pseudo' => 'pris'])
        ->assertSessionHasErrors('pseudo');
});

test('on change son mot de passe en donnant l\'actuel', function () {
    $this->actingAs($this->user)
        ->put(route('compte.mot-de-passe.update'), ['current_password' => 'password', 'password' => 'conakry-2027'])
        ->assertSessionHasNoErrors();

    expect(Hash::check('conakry-2027', $this->user->fresh()->password))->toBeTrue()
        ->and(EntreeJournalAcces::where('action', 'mot_de_passe.change')->where('cible_id', $this->user->id)->exists())->toBeTrue();
});

test('sans le bon mot de passe actuel, rien ne change', function () {
    $this->actingAs($this->user)
        ->put(route('compte.mot-de-passe.update'), ['current_password' => 'faux', 'password' => 'conakry-2027'])
        ->assertSessionHasErrors(['current_password' => 'Le mot de passe est incorrect.']);

    expect(Hash::check('password', $this->user->fresh()->password))->toBeTrue();
});

test('on change de numéro : code au nouveau numéro, puis confirmation', function () {
    $this->actingAs($this->user)
        ->post(route('compte.numero.envoyer'), ['telephone' => '655 00 11 22', 'current_password' => 'password'])
        ->assertRedirect(route('compte.numero.edit'));

    $this->actingAs($this->user)->get(route('compte.numero.edit'))
        ->assertInertia(fn (Assert $page) => $page->where('nouveauNumeroMasque', '6•• •• •1 22'));

    $this->actingAs($this->user)
        ->put(route('compte.numero.update'), ['code' => $this->sms->dernierCode('+224655001122')])
        ->assertRedirect(route('compte.numero.edit'));

    $user = $this->user->fresh();
    expect($user->telephone)->toBe('+224655001122')
        ->and($user->telephone_verifie_le)->not->toBeNull();

    $entree = EntreeJournalAcces::where('action', 'numero.change')->sole();
    expect($entree->details)->toBe(['ancien' => '6•• •• •4 56', 'nouveau' => '6•• •• •1 22']);
});

test('changer de numéro demande le mot de passe actuel', function () {
    $this->actingAs($this->user)
        ->post(route('compte.numero.envoyer'), ['telephone' => '655001122', 'current_password' => 'faux'])
        ->assertSessionHasErrors('current_password');

    expect($this->sms->nombreEnvoyes())->toBe(0);
});

test('on ne prend pas le numéro d\'un autre compte', function () {
    User::factory()->create(['telephone' => '+224655001122']);

    $this->actingAs($this->user)
        ->post(route('compte.numero.envoyer'), ['telephone' => '655001122', 'current_password' => 'password'])
        ->assertSessionHasErrors('telephone');
});

test('un mauvais code ne change pas le numéro', function () {
    $this->actingAs($this->user)
        ->post(route('compte.numero.envoyer'), ['telephone' => '655001122', 'current_password' => 'password']);
    $faux = $this->sms->dernierCode('+224655001122') === '000000' ? '111111' : '000000';

    $this->actingAs($this->user)
        ->put(route('compte.numero.update'), ['code' => $faux])
        ->assertSessionHasErrors('code');

    expect($this->user->fresh()->telephone)->toBe('+224622123456');
});

test('on supprime son compte avec son mot de passe ; la trace reste au journal', function () {
    $id = $this->user->id;

    $this->actingAs($this->user)
        ->delete(route('compte.destroy'), ['password' => 'password'])
        ->assertRedirect('/');

    $this->assertGuest();
    expect(User::find($id))->toBeNull();

    $entree = EntreeJournalAcces::where('action', 'compte.supprime')->sole();
    expect($entree->cible_id)->toBe($id)->and($entree->auteur_id)->toBeNull();
});

test('sans le bon mot de passe, le compte n\'est pas supprimé', function () {
    $this->actingAs($this->user)
        ->delete(route('compte.destroy'), ['password' => 'faux'])
        ->assertSessionHasErrors('password');

    expect($this->user->fresh())->not->toBeNull();
});
