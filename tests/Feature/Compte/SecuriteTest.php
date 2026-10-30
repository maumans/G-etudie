<?php

use App\Enums\Role;
use App\Models\EntreeJournalAcces;
use App\Models\User;
use App\Support\JournalAcces;
use Inertia\Testing\AssertableInertia as Assert;
use Laravel\Fortify\Fortify;
use PragmaRX\Google2FA\Google2FA;

/** Mot de passe confirmé il y a un instant (`password.confirm`). */
function personnelConfirme(Role $role = Role::Redacteur): User
{
    $user = User::factory()->avecRole($role)->create(['pseudo' => 'ibra_redaction', 'telephone' => '+224622123456']);
    test()->actingAs($user)->withSession(['auth.password_confirmed_at' => time()]);

    return $user;
}

test('l\'écran demande d\'abord de retaper son mot de passe', function () {
    $this->actingAs(User::factory()->avecRole(Role::Redacteur)->create())
        ->get(route('compte.securite.edit'))
        ->assertRedirect(route('password.confirm'));
});

test('un élève n\'a ni l\'écran ni l\'activation', function () {
    $eleve = User::factory()->create();

    $this->actingAs($eleve)->withSession(['auth.password_confirmed_at' => time()])
        ->get(route('compte.securite.edit'))
        ->assertForbidden();

    $this->post(route('two-factor.enable'))->assertForbidden();

    expect($eleve->fresh()->two_factor_secret)->toBeNull();
});

test('activer, confirmer avec le code, puis désactiver : tout est journalisé', function () {
    $user = personnelConfirme();

    $this->get(route('compte.securite.edit'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('compte/securite')->where('etat', 'inactive'));

    $this->post(route('two-factor.enable'))->assertRedirect();

    $cle = Fortify::currentEncrypter()->decrypt($user->fresh()->two_factor_secret);

    $this->get(route('compte.securite.edit'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('etat', 'a_confirmer')
            ->where('configuration.cle', $cle)
            ->where('configuration.qrSvg', fn (string $svg) => str_starts_with($svg, '<svg')));

    $this->post(route('two-factor.confirm'), ['code' => app(Google2FA::class)->getCurrentOtp($cle)])
        ->assertSessionHasNoErrors();

    expect($user->fresh()->hasEnabledTwoFactorAuthentication())->toBeTrue();

    $this->get(route('compte.securite.edit'))
        ->assertInertia(fn (Assert $page) => $page->where('etat', 'active')->has('codesSecours', 8));

    $this->delete(route('two-factor.disable'));

    expect($user->fresh()->two_factor_secret)->toBeNull()
        ->and(EntreeJournalAcces::pluck('action')->all())
        ->toBe(['double_authentification.activee', 'double_authentification.desactivee']);
});

test('un mauvais code ne confirme rien, avec un message', function () {
    $user = personnelConfirme();
    $this->post(route('two-factor.enable'));

    $this->post(route('two-factor.confirm'), ['code' => '000000'])
        ->assertSessionHasErrorsIn('confirmTwoFactorAuthentication', 'code');

    expect($user->fresh()->hasEnabledTwoFactorAuthentication())->toBeFalse();
});

test('le QR code porte le pseudo, jamais le numéro de téléphone', function () {
    $user = personnelConfirme();
    $this->post(route('two-factor.enable'));

    expect($user->fresh()->adresseDoubleAuthentification())
        ->toStartWith('otpauth://totp/')
        ->toContain('ibra_redaction')
        ->not->toContain('622123456');
});

test('le personnel connecté avec la double authentification passe par le code', function () {
    $user = User::factory()->avecRole(Role::Superadmin)->withTwoFactor()->create(['telephone' => '+224622123456']);

    $this->post(route('login.store'), ['telephone' => '622123456', 'password' => 'password'])
        ->assertRedirect(route('two-factor.login'));

    $this->assertGuest();
});

test('l\'activité montre les gestes faits par le compte ou sur lui, jamais ceux des autres', function () {
    $user = personnelConfirme();
    $autre = User::factory()->create();

    JournalAcces::consigner('mot_de_passe.change', $user, auteur: $user);
    JournalAcces::consigner('numero.change', $user, auteur: null);
    JournalAcces::consigner('mot_de_passe.change', $autre, auteur: $autre);

    $this->get(route('compte.securite.edit'))
        ->assertInertia(fn (Assert $page) => $page
            ->has('activite', 2)
            ->where('activite.0.libelle', 'Numéro changé')
            ->where('activite.1.libelle', 'Mot de passe changé')
            ->where('session.fin', fn (string $fin) => $fin !== ''));
});
