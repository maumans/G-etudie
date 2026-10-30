<?php

use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Support\Facades\Hash;

beforeEach(function () {
    config(['demonstration.mot_de_passe' => 'demo-mot-de-passe']);
});

test('le compte de démonstration est créé une fois, avec un numéro vérifié', function () {
    $this->seed(DatabaseSeeder::class);
    $this->seed(DatabaseSeeder::class);

    $eleve = User::sole();
    expect($eleve->telephone)->toBe('+224600000001')
        ->and($eleve->telephone_verifie_le)->not->toBeNull()
        ->and(Hash::check('demo-mot-de-passe', $eleve->password))->toBeTrue();
});

test('un nouveau db:seed ne réinitialise jamais un mot de passe changé', function () {
    $this->seed(DatabaseSeeder::class);
    User::sole()->update(['password' => 'change-par-l-eleve']);

    $this->seed(DatabaseSeeder::class);

    expect(Hash::check('change-par-l-eleve', User::sole()->password))->toBeTrue();
});

test('sans mot de passe de démonstration dans .env, le seeder refuse', function () {
    config(['demonstration.mot_de_passe' => null]);

    expect(fn () => $this->seed(DatabaseSeeder::class))->toThrow(RuntimeException::class);
    expect(User::count())->toBe(0);
});

test('les comptes de démonstration ne sont jamais créés en production', function () {
    app()->detectEnvironment(fn () => 'production');

    // Appel direct : en production, la commande db:seed demanderait d'abord
    // une confirmation ; c'est le refus du seeder lui-même qu'on vérifie.
    expect(fn () => (new DatabaseSeeder)->run())->toThrow(RuntimeException::class, 'production');
    expect(User::count())->toBe(0);
});
