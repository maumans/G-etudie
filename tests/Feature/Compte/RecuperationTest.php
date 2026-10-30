<?php

use App\Models\CodeSms;
use App\Models\EntreeJournalAcces;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->sms = smsEnMemoire();
});

test('un numéro vérifié reçoit un code, et le code + un nouveau mot de passe reconnectent', function () {
    $user = User::factory()->create(['telephone' => '+224622123456']);

    $this->post(route('compte.recuperation.store'), ['telephone' => '622 12 34 56'])
        ->assertRedirect(route('compte.recuperation.code'));

    $this->get(route('compte.recuperation.code'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('auth/code-recuperation')
            ->where('numeroMasque', '6•• •• •4 56'));

    $this->post(route('compte.recuperation.update'), [
        'code' => $this->sms->dernierCode('+224622123456'),
        'password' => 'nouveau-mdp',
    ])->assertRedirect('/accueil');

    $this->assertAuthenticatedAs($user);
    expect(Hash::check('nouveau-mdp', $user->fresh()->password))->toBeTrue()
        ->and(EntreeJournalAcces::where('action', 'mot_de_passe.recupere')->where('cible_id', $user->id)->exists())->toBeTrue();
});

test('le numéro ne passe jamais dans l\'adresse', function () {
    User::factory()->create(['telephone' => '+224622123456']);

    $reponse = $this->post(route('compte.recuperation.store'), ['telephone' => '622123456']);

    expect($reponse->headers->get('Location'))->not->toContain('622');
});

test('rien ne dit si un compte existe : même réponse pour un numéro inconnu, aucun SMS', function () {
    $this->post(route('compte.recuperation.store'), ['telephone' => '655000000'])
        ->assertRedirect(route('compte.recuperation.code'));

    expect($this->sms->nombreEnvoyes())->toBe(0);

    $this->post(route('compte.recuperation.update'), ['code' => '123456', 'password' => 'nouveau-mdp'])
        ->assertSessionHasErrors(['code' => "Ce code n'est plus valable. Demande un nouveau code."]);
});

test('un numéro jamais vérifié ne reçoit pas de code', function () {
    User::factory()->numeroNonVerifie()->create(['telephone' => '+224622123456']);

    $this->post(route('compte.recuperation.store'), ['telephone' => '622123456']);

    expect($this->sms->nombreEnvoyes())->toBe(0);
});

test('un mauvais code compte les essais, et au cinquième le code n\'est plus valable', function () {
    $user = User::factory()->create(['telephone' => '+224622123456']);
    $this->post(route('compte.recuperation.store'), ['telephone' => '622123456']);
    $bon = $this->sms->dernierCode('+224622123456');
    $faux = $bon === '000000' ? '111111' : '000000';

    $this->post(route('compte.recuperation.update'), ['code' => $faux, 'password' => 'nouveau-mdp'])
        ->assertSessionHasErrors(['code' => 'Code incorrect. Il te reste 4 essais.']);

    foreach (range(1, 4) as $essai) {
        $this->post(route('compte.recuperation.update'), ['code' => $faux, 'password' => 'nouveau-mdp']);
    }

    $this->post(route('compte.recuperation.update'), ['code' => $bon, 'password' => 'nouveau-mdp'])
        ->assertSessionHasErrors(['code' => "Ce code n'est plus valable. Demande un nouveau code."]);

    $this->assertGuest();
    expect(Hash::check('password', $user->fresh()->password))->toBeTrue();
});

test('un code expiré n\'est plus valable', function () {
    User::factory()->create(['telephone' => '+224622123456']);
    $this->post(route('compte.recuperation.store'), ['telephone' => '622123456']);
    $code = $this->sms->dernierCode('+224622123456');

    $this->travel(11)->minutes();

    $this->post(route('compte.recuperation.update'), ['code' => $code, 'password' => 'nouveau-mdp'])
        ->assertSessionHasErrors(['code' => "Ce code n'est plus valable. Demande un nouveau code."]);
});

test('le code n\'est jamais gardé en clair, et un nouveau code annule le précédent', function () {
    User::factory()->create(['telephone' => '+224622123456']);

    $this->post(route('compte.recuperation.store'), ['telephone' => '622123456']);
    $premier = $this->sms->dernierCode('+224622123456');
    $this->post(route('compte.recuperation.store'), ['telephone' => '622123456']);

    expect(CodeSms::where('code_hache', $premier)->exists())->toBeFalse()
        ->and(CodeSms::whereNull('utilise_le')->count())->toBe(1);

    $this->post(route('compte.recuperation.update'), ['code' => $premier, 'password' => 'nouveau-mdp'])
        ->assertSessionHasErrors('code');
});

test('au-delà de 3 codes en 15 minutes pour un numéro, la demande est refusée', function () {
    User::factory()->create(['telephone' => '+224622123456']);

    foreach (range(1, 3) as $demande) {
        $this->post(route('compte.recuperation.store'), ['telephone' => '622123456']);
    }

    $this->post(route('compte.recuperation.store'), ['telephone' => '622123456'])
        ->assertSessionHasErrors('telephone');

    expect($this->sms->nombreEnvoyes())->toBe(3);
});

test('sans numéro en session, l\'écran du code renvoie à la demande', function () {
    $this->get(route('compte.recuperation.code'))
        ->assertRedirect(route('compte.recuperation.create'));
});
