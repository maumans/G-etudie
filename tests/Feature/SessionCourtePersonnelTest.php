<?php

use App\Enums\Role;
use App\Http\Middleware\SessionCourtePersonnel;
use App\Models\User;

function connecter(User $user, bool $seSouvenir = false): void
{
    test()->post(route('login.store'), [
        'telephone' => $user->telephone,
        'password' => 'password',
        'remember' => $seSouvenir ? 'on' : null,
    ]);
}

test('le personnel est déconnecté 12 h après sa connexion, même actif', function () {
    $redacteur = User::factory()->avecRole(Role::Redacteur)->create();
    connecter($redacteur);

    $this->travel(11)->hours();
    $this->get('/contenu')->assertOk();

    $this->travel(1)->hours();
    $this->get('/contenu')
        ->assertRedirect(route('login'))
        ->assertSessionHas('status');

    $this->assertGuest();
});

test('un élève garde sa session au-delà de 12 h', function () {
    $eleve = User::factory()->create();
    connecter($eleve);

    $this->travel(3)->days();

    $this->get('/eleve')->assertOk();
    $this->assertAuthenticatedAs($eleve);
});

test('la connexion note son heure dans la session', function () {
    connecter(User::factory()->avecRole(Role::Superadmin)->create());

    expect(session(SessionCourtePersonnel::CLE))->toBe(now()->getTimestamp());
});

test('le cookie « se souvenir de moi » ne reconnecte pas le personnel', function () {
    $relecteur = User::factory()->avecRole(Role::Relecteur)->create();
    connecter($relecteur, seSouvenir: true);

    $rappel = $this->app['auth']->guard('web')->getRecallerName();
    $relecteur->refresh();
    $valeur = $relecteur->getKey().'|'.$relecteur->getRememberToken().'|'.$relecteur->password;

    // Nouvelle visite sans session, avec seulement le cookie de rappel.
    $this->flushSession();
    $this->app['auth']->forgetGuards();

    $this->withCookie($rappel, $valeur)
        ->get('/contenu')
        ->assertRedirect(route('login'));

    $this->assertGuest();
});

test('témoin : le même cookie de rappel reconnecte bien un élève', function () {
    $eleve = User::factory()->create();
    connecter($eleve, seSouvenir: true);

    $rappel = $this->app['auth']->guard('web')->getRecallerName();
    $eleve->refresh();
    $valeur = $eleve->getKey().'|'.$eleve->getRememberToken().'|'.$eleve->password;

    $this->flushSession();
    $this->app['auth']->forgetGuards();

    $this->withCookie($rappel, $valeur)->get('/eleve')->assertOk();
    $this->assertAuthenticatedAs($eleve);
});
