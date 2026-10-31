<?php

use App\Enums\Role;
use App\Models\Examen;
use App\Models\User;
use Database\Seeders\ReferentielSeeder;
use Inertia\Testing\AssertableInertia as Assert;

/*
 * Date de la prochaine session : saisie par le responsable pédagogique dans
 * Référentiel › Épreuves, jamais semée (CLAUDE.md § 5).
 */

beforeEach(function () {
    $this->seed(ReferentielSeeder::class);
    $this->responsable = User::factory()->avecRole(Role::AdminContenu)->create();
    $this->bepc = Examen::where('code', 'BEPC')->sole();
});

test('le référentiel ne sème aucune date d\'examen', function () {
    expect(Examen::whereNotNull('date_prochaine_session')->count())->toBe(0);
});

test('par l\'écran : le responsable pédagogique saisit, puis efface, la date du BEPC', function () {
    $this->actingAs($this->responsable)->get(route('contenu.referentiel.epreuves.index', ['parcours' => 'BEPC']))
        ->assertInertia(fn (Assert $page) => $page
            ->where('parcours.1.examen_id', $this->bepc->id)
            ->where('parcours.1.session', null));

    $this->actingAs($this->responsable)
        ->put(route('contenu.referentiel.examens.session', $this->bepc), ['date_prochaine_session' => now()->addMonths(7)->toDateString()])
        ->assertRedirect();

    expect($this->bepc->fresh()->date_prochaine_session->toDateString())->toBe(now()->addMonths(7)->toDateString());

    $this->actingAs($this->responsable)
        ->put(route('contenu.referentiel.examens.session', $this->bepc), ['date_prochaine_session' => null]);

    expect($this->bepc->fresh()->date_prochaine_session)->toBeNull();
});

test('une date passée ou mal formée est refusée', function () {
    $this->actingAs($this->responsable)
        ->put(route('contenu.referentiel.examens.session', $this->bepc), ['date_prochaine_session' => '2020-06-15'])
        ->assertSessionHasErrors(['date_prochaine_session' => 'La date de la session doit être à venir.']);
    $this->actingAs($this->responsable)
        ->put(route('contenu.referentiel.examens.session', $this->bepc), ['date_prochaine_session' => '15/06/2027'])
        ->assertSessionHasErrors('date_prochaine_session');

    expect($this->bepc->fresh()->date_prochaine_session)->toBeNull();
});

test('un rédacteur ne peut pas changer la date', function () {
    $redacteur = User::factory()->avecRole(Role::Redacteur)->create();

    $this->actingAs($redacteur)
        ->put(route('contenu.referentiel.examens.session', $this->bepc), ['date_prochaine_session' => now()->addYear()->toDateString()])
        ->assertForbidden();
});
