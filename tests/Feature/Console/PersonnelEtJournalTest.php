<?php

use App\Enums\Role;
use App\Models\EntreeJournalAcces;
use App\Models\User;
use App\Services\Plateforme\ComptesService;
use App\Support\JournalAcces;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Testing\AssertableInertia;

/*
| Lot 13 : Console › Personnel (désactiver, réactiver un compte du
| personnel — point ouvert du point 15) et Console › Journal des accès.
*/

beforeEach(function () {
    $this->admin = User::factory()->avecRole(Role::Superadmin)->create();
});

test('désactiver un rédacteur ferme ses sessions, l’empêche de se connecter et le journalise', function () {
    $redacteur = User::factory()->avecRole(Role::Redacteur)->create(['password' => 'secret-1234']);
    DB::table('sessions')->insert(['id' => 'session-du-redacteur', 'user_id' => $redacteur->id, 'payload' => '', 'last_activity' => now()->timestamp]);
    $jeton = $redacteur->remember_token;

    $this->actingAs($this->admin)->post("/console/personnel/{$redacteur->id}/desactiver")->assertRedirect();

    $redacteur->refresh();
    expect($redacteur->desactive_le)->not->toBeNull()
        ->and($redacteur->remember_token)->not->toBe($jeton)
        ->and(DB::table('sessions')->where('user_id', $redacteur->id)->count())->toBe(0);
    $entree = EntreeJournalAcces::query()->where('action', 'compte.desactive')->sole();
    expect($entree->cible_id)->toBe($redacteur->id)->and($entree->auteur_id)->toBe($this->admin->id);

    // Une session encore ouverte ailleurs est déconnectée à sa requête suivante.
    $this->actingAs($redacteur)->get('/contenu')->assertRedirect(route('login'));
    $this->assertGuest();

    // Et la connexion est refusée.
    $this->post('/login', ['telephone' => $redacteur->telephone, 'password' => 'secret-1234']);
    $this->assertGuest();

    $this->actingAs($this->admin)->post("/console/personnel/{$redacteur->id}/reactiver")->assertRedirect();
    expect($redacteur->fresh()->desactive_le)->toBeNull()
        ->and(EntreeJournalAcces::query()->where('action', 'compte.reactive')->count())->toBe(1);
});

test('on ne désactive ni son propre compte, ni le dernier administrateur actif', function () {
    $this->actingAs($this->admin)->post("/console/personnel/{$this->admin->id}/desactiver")->assertSessionHasErrors('compte');
    expect($this->admin->fresh()->desactive_le)->toBeNull();

    // Deux administrateurs actifs : l'un peut désactiver l'autre.
    $second = User::factory()->avecRole(Role::Superadmin)->create();
    $this->actingAs($second)->post("/console/personnel/{$this->admin->id}/desactiver")->assertRedirect();
    expect($this->admin->fresh()->desactive_le)->not->toBeNull();

    // $second est le dernier actif : le service refuse de le désactiver,
    // quel que soit l'auteur (la plateforme n'aurait plus d'administrateur).
    expect(fn () => app(ComptesService::class)->desactiver($second, $this->admin->fresh()))
        ->toThrow(ValidationException::class);
    expect($second->fresh()->desactive_le)->toBeNull();
});

test('un élève ou un parent n’est pas un compte du personnel : 404', function (Role $role) {
    $compte = User::factory()->avecRole($role)->create();

    $this->actingAs($this->admin)->post("/console/personnel/{$compte->id}/desactiver")->assertNotFound();
    expect($compte->fresh()->desactive_le)->toBeNull();
})->with([Role::Eleve, Role::Parent]);

test('la liste du personnel : rôles, double authentification, numéro masqué, filtres', function () {
    $enseignante = User::factory()->avecRole(Role::Enseignant)->create(['prenom' => 'Fatoumata']);
    User::factory()->avecRole(Role::Eleve)->create(['prenom' => 'Élève invisible']);

    $this->actingAs($this->admin)->get('/console/personnel')
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page->component('console/personnel')
            ->where('comptes.total', 2)
            ->where('bilan.actifs', 2));

    $reponse = $this->actingAs($this->admin)->get('/console/personnel?role=enseignant');
    $reponse->assertInertia(fn (AssertableInertia $page) => $page
        ->where('comptes.total', 1)
        ->where('comptes.donnees.0.nom', trim('Fatoumata '.$enseignante->nom))
        ->where('comptes.donnees.0.roles.0', 'Enseignant')
        ->where('comptes.donnees.0.double_authentification', false));
    expect($reponse->getContent())->not->toContain($enseignante->telephone)->not->toContain('Élève invisible');
});

test('le journal des accès liste les entrées, filtre par action et par auteur', function () {
    $redacteur = User::factory()->avecRole(Role::Redacteur)->create(['prenom' => 'Ibrahima']);
    JournalAcces::consigner('mot_de_passe.change', $redacteur, auteur: $redacteur);
    JournalAcces::consigner('lot_codes.cree', null, ['quantite' => 10], $this->admin);

    $this->actingAs($this->admin)->get('/console/journal')
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page->component('console/journal')
            ->where('entrees.total', 2)
            ->where('entrees.donnees.0.action', 'lot_codes.cree')
            ->where('entrees.donnees.0.famille', 'argent'));

    $this->actingAs($this->admin)->get('/console/journal?action=mot_de_passe.change')
        ->assertInertia(fn (AssertableInertia $page) => $page->where('entrees.total', 1)
            ->where('entrees.donnees.0.libelle', 'Mot de passe changé'));
    $this->actingAs($this->admin)->get('/console/journal?recherche=Ibrahima')
        ->assertInertia(fn (AssertableInertia $page) => $page->where('entrees.total', 1));
    $this->actingAs($this->admin)->get('/console/journal?action=inconnue')->assertSessionHasErrors('action');
});
