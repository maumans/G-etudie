<?php

use App\Models\EntreeJournalAcces;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->sms = smsEnMemoire();
    $this->user = User::factory()->numeroNonVerifie()->create(['telephone' => '+224622123456']);
});

test('la vérification est proposée, jamais imposée : l\'espace élève reste ouvert', function () {
    $this->actingAs($this->user)
        ->get(route('compte.verification.edit'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('auth/verifier-numero')
            ->where('codeEnvoye', false));

    $this->actingAs($this->user)->get(route('eleve.accueil'))->assertOk();
});

test('le code reçu par SMS vérifie le numéro', function () {
    $this->actingAs($this->user)->post(route('compte.verification.envoyer'));

    $this->actingAs($this->user)
        ->post(route('compte.verification.confirmer'), ['code' => $this->sms->dernierCode('+224622123456')])
        ->assertRedirect(route('eleve.accueil'));

    expect($this->user->fresh()->telephone_verifie_le)->not->toBeNull()
        ->and(EntreeJournalAcces::where('action', 'numero.verifie')->exists())->toBeTrue();
});

test('un mauvais code ne vérifie pas le numéro', function () {
    $this->actingAs($this->user)->post(route('compte.verification.envoyer'));
    $faux = $this->sms->dernierCode('+224622123456') === '000000' ? '111111' : '000000';

    $this->actingAs($this->user)
        ->post(route('compte.verification.confirmer'), ['code' => $faux])
        ->assertSessionHasErrors(['code' => 'Code incorrect. Il te reste 4 essais.']);

    expect($this->user->fresh()->telephone_verifie_le)->toBeNull();
});

test('un numéro déjà vérifié est renvoyé vers l\'accueil', function () {
    $this->actingAs(User::factory()->create())
        ->get(route('compte.verification.edit'))
        ->assertRedirect(route('eleve.accueil'));
});
