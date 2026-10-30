<?php

use App\Enums\Role;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\DemoSeeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role as ModeleRole;

beforeEach(function () {
    config(['demonstration.mot_de_passe' => 'demo-mot-de-passe']);
});

test('un compte de démonstration par rôle, créé une fois, numéro vérifié', function () {
    $this->seed(DatabaseSeeder::class);
    $this->seed(DatabaseSeeder::class);

    expect(User::count())->toBe(count(Role::cases()));

    foreach (DemoSeeder::COMPTES as $compte) {
        $user = User::where('telephone', $compte['telephone'])->sole();

        expect($user->getRoleNames()->all())->toBe([$compte['role']->value])
            ->and($user->telephone_verifie_le)->not->toBeNull()
            ->and(Hash::check('demo-mot-de-passe', $user->password))->toBeTrue();
    }
});

test('chaque rôle a son compte de démonstration', function () {
    $roles = array_map(fn (array $compte) => $compte['role'], DemoSeeder::COMPTES);

    expect($roles)->toEqualCanonicalizing(Role::cases());
});

test('un nouveau db:seed ne réinitialise jamais un mot de passe changé', function () {
    $this->seed(DatabaseSeeder::class);
    $eleve = User::where('telephone', '+224600000001')->sole();
    $eleve->update(['password' => 'change-par-l-eleve']);

    $this->seed(DatabaseSeeder::class);

    expect(Hash::check('change-par-l-eleve', $eleve->fresh()->password))->toBeTrue();
});

test('sans mot de passe de démonstration dans .env, le seeder refuse', function () {
    config(['demonstration.mot_de_passe' => null]);

    expect(fn () => $this->seed(DatabaseSeeder::class))->toThrow(RuntimeException::class);
    expect(User::count())->toBe(0);
});

test('en production, db:seed sème les rôles mais aucun compte de démonstration', function () {
    app()->detectEnvironment(fn () => 'production');

    // Appel direct : en production, la commande db:seed demanderait d'abord
    // une confirmation ; c'est le comportement des seeders qu'on vérifie.
    (new DatabaseSeeder)->setContainer(app())->run();

    expect(User::count())->toBe(0)
        ->and(ModeleRole::count())->toBe(count(Role::cases()));
    expect(fn () => (new DemoSeeder)->run())->toThrow(RuntimeException::class, 'production');
});
