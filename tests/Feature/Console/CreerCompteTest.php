<?php

use App\Models\EntreeJournalAcces;
use App\Models\User;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Hash;

/*
| `php artisan compte:creer` (MISE_EN_PRODUCTION.md § 3, étape 12) : le
| premier administrateur en production, puis le personnel du contenu et les
| parents. Mot de passe provisoire montré une seule fois, jamais sur la
| ligne de commande ; numéro tenu pour vérifié ; journalisé.
*/

test('ouvre le premier administrateur, avec un mot de passe provisoire qui permet de se connecter', function () {
    expect(Artisan::call('compte:creer', ['role' => 'superadmin', 'telephone' => '620 00 00 00', 'prenom' => 'Maurice']))->toBe(0);

    $sortie = Artisan::output();
    preg_match('/Mot de passe provisoire : (\S+)/u', $sortie, $trouve);
    $motDePasse = $trouve[1] ?? '';

    $user = User::sole();
    expect($user->telephone)->toBe('+224620000000')
        ->and($user->prenom)->toBe('Maurice')
        ->and($user->pseudo)->toStartWith('maurice_')
        ->and($user->getRoleNames()->all())->toBe(['superadmin'])
        ->and($user->telephone_verifie_le)->not->toBeNull()
        ->and(strlen($motDePasse))->toBe(10)
        ->and(Hash::check($motDePasse, $user->password))->toBeTrue()
        ->and($sortie)->toContain('double authentification');

    $entree = EntreeJournalAcces::query()->where('action', 'compte.ouvert_par_administrateur')->sole();
    expect($entree->cible_id)->toBe($user->id)
        ->and($entree->details)->toBe(['role' => 'superadmin'])
        // Rien du mot de passe au journal.
        ->and(json_encode($entree->toArray()))->not->toContain($motDePasse);

    // La vraie porte : la page de connexion, puis la console.
    $this->post(route('login.store'), ['telephone' => '620000000', 'password' => $motDePasse])->assertRedirect();
    $this->assertAuthenticatedAs($user);
    $this->get('/accueil')->assertRedirect('/console');
});

test('ouvre le personnel du contenu et les parents', function (string $role) {
    expect(Artisan::call('compte:creer', ['role' => $role, 'telephone' => '621000000', 'prenom' => 'Kadiatou']))->toBe(0);

    expect(User::sole()->hasRole($role))->toBeTrue();
})->with(['admin_contenu', 'redacteur', 'relecteur', 'parent']);

test('refuse les rôles qui ont leur propre porte, un rôle inconnu, un numéro pris ou invalide', function (array $arguments, string $message) {
    User::factory()->create(['telephone' => '+224622000000']);

    expect(Artisan::call('compte:creer', $arguments))->toBe(1)
        ->and(Artisan::output())->toContain($message)
        ->and(User::query()->count())->toBe(1);
})->with([
    'élève' => [['role' => 'eleve', 'telephone' => '620000001', 'prenom' => 'A'], 'page « Créer un compte »'],
    'enseignant' => [['role' => 'enseignant', 'telephone' => '620000001', 'prenom' => 'A'], 'Console › Établissements'],
    'gestionnaire' => [['role' => 'gestionnaire_etablissement', 'telephone' => '620000001', 'prenom' => 'A'], 'Console › Établissements'],
    'inconnu' => [['role' => 'roi', 'telephone' => '620000001', 'prenom' => 'A'], 'Rôle inconnu'],
    'numéro pris' => [['role' => 'redacteur', 'telephone' => '622 00 00 00', 'prenom' => 'A'], 'existe déjà'],
    'numéro invalide' => [['role' => 'redacteur', 'telephone' => '12345', 'prenom' => 'A'], 'numéro guinéen'],
    'prénom vide' => [['role' => 'redacteur', 'telephone' => '620000001', 'prenom' => '  '], 'prénom est obligatoire'],
]);

test('chaque compte a son propre mot de passe provisoire, sans caractère à confondre', function () {
    Artisan::call('compte:creer', ['role' => 'redacteur', 'telephone' => '620000001', 'prenom' => 'A']);
    preg_match('/Mot de passe provisoire : (\S+)/u', Artisan::output(), $premier);
    Artisan::call('compte:creer', ['role' => 'redacteur', 'telephone' => '620000002', 'prenom' => 'A']);
    preg_match('/Mot de passe provisoire : (\S+)/u', Artisan::output(), $second);

    expect($premier[1])->not->toBe($second[1])
        ->and($premier[1].$second[1])->not->toMatch('/[0O1lI]/');
});
