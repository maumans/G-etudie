<?php

use App\Enums\Role;
use App\Models\Chapitre;
use App\Models\Lecon;
use App\Models\Notion;
use App\Models\User;
use App\Models\VersionContenu;
use App\Support\BlocsContenu;
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

test('le contenu de démonstration : fictif, valide, à chaque statut, semé une fois', function () {
    $this->seed(DatabaseSeeder::class);
    $this->seed(DatabaseSeeder::class);

    $lecons = Lecon::all();

    expect($lecons)->toHaveCount(5)
        ->and($lecons->every(fn ($lecon) => $lecon->est_exemple))->toBeTrue()
        ->and(Chapitre::where('est_exemple', false)->count())->toBe(0)
        ->and(Notion::where('est_exemple', false)->count())->toBe(0)
        ->and($lecons->pluck('statut')->map->value->unique()->sort()->values()->all())
        ->toBe(['brouillon', 'en_relecture', 'publie']);

    foreach ($lecons as $lecon) {
        expect(BlocsContenu::erreur($lecon->brouillon))->toBeNull();
    }

    // Aucune leçon publiée par son propre auteur.
    VersionContenu::whereNotNull('decide_par_id')
        ->where('decision', '!=', 'retiree')
        ->each(fn ($version) => expect($version->decide_par_id)->not->toBe($version->auteur_id));
});
