<?php

use App\Enums\Permission;
use App\Enums\Role;
use App\Models\User;
use Database\Seeders\RolesEtPermissionsSeeder;
use Spatie\Permission\Models\Permission as ModelePermission;
use Spatie\Permission\Models\Role as ModeleRole;

test('le seeder recopie chaque rôle avec ses permissions, et se relance sans effet', function () {
    $this->seed(RolesEtPermissionsSeeder::class);
    $this->seed(RolesEtPermissionsSeeder::class);

    expect(ModeleRole::count())->toBe(count(Role::cases()))
        ->and(ModelePermission::count())->toBe(count(Permission::cases()));

    foreach (Role::cases() as $role) {
        $enBase = ModeleRole::findByName($role->value)->permissions->pluck('name')->sort()->values()->all();
        $attendu = collect($role->permissions())->map(fn (Permission $p) => $p->value)->sort()->values()->all();

        expect($enBase)->toBe($attendu);
    }
});

test('une permission que le code ne connaît plus est retirée de la base', function () {
    ModelePermission::findOrCreate('ancienne.permission', 'web');
    ModeleRole::findByName(Role::Eleve->value)->givePermissionTo('ancienne.permission');

    $this->seed(RolesEtPermissionsSeeder::class);

    expect(ModelePermission::where('name', 'ancienne.permission')->exists())->toBeFalse();
});

test('seul le personnel a la double authentification', function () {
    foreach (Role::cases() as $role) {
        expect(in_array(Permission::DoubleAuthentification, $role->permissions(), true))
            ->toBe($role->estPersonnel());
    }
});

test('l\'inscription ouvre un compte élève, et seulement élève', function () {
    $this->post(route('register.store'), [
        'prenom' => 'Mariama',
        'pseudo' => 'mariama',
        'telephone' => '622 12 34 56',
        'password' => 'mot-de-passe',
    ]);

    expect(User::where('telephone', '+224622123456')->sole()->getRoleNames()->all())->toBe(['eleve']);
});

test('après connexion, chaque rôle arrive dans son espace', function (Role $role, string $arrivee) {
    $user = User::factory()->avecRole($role)->create(['telephone' => '+224622123456']);

    $this->post(route('login.store'), ['telephone' => '622123456', 'password' => 'password'])
        ->assertRedirect('/accueil');

    $this->actingAs($user)->get('/accueil')->assertRedirect($arrivee);
})->with([
    [Role::Eleve, '/eleve'],
    [Role::Redacteur, '/contenu'],
    [Role::Relecteur, '/contenu'],
    [Role::AdminContenu, '/contenu'],
    [Role::Superadmin, '/console'],
    [Role::Parent, '/compte/profil'],
    [Role::Enseignant, '/compte/profil'],
    [Role::GestionnaireEtablissement, '/compte/profil'],
]);

test('un compte connecté qui ouvre la page de connexion retourne dans son espace', function () {
    $this->actingAs(User::factory()->avecRole(Role::Redacteur)->create())
        ->get(route('login'))
        ->assertRedirect('/accueil');
});

test('un élève qui ouvre la console reçoit la page « Accès réservé »', function () {
    $this->actingAs(User::factory()->create())
        ->get('/console')
        ->assertForbidden()
        ->assertInertia(fn ($page) => $page->component('erreur')->where('statut', 403));
});
