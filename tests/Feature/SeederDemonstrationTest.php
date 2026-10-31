<?php

use App\Enums\Role;
use App\Models\Chapitre;
use App\Models\Lecon;
use App\Models\Notion;
use App\Models\Question;
use App\Models\Tentative;
use App\Models\User;
use App\Models\VersionContenu;
use App\Support\BlocsContenu;
use App\Support\CatalogueEleve;
use App\Support\FormatQuestion;
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

    expect(User::count())->toBe(count(DemoSeeder::COMPTES));

    foreach (DemoSeeder::COMPTES as $compte) {
        $user = User::where('telephone', $compte['telephone'])->sole();

        expect($user->getRoleNames()->all())->toBe([$compte['role']->value])
            ->and($user->telephone_verifie_le)->not->toBeNull()
            ->and(Hash::check('demo-mot-de-passe', $user->password))->toBeTrue();
    }
});

test('chaque rôle a son compte de démonstration', function () {
    $roles = array_map(fn (array $compte) => $compte['role'], DemoSeeder::COMPTES);

    // Deux élèves (BEPC, Bac SE) depuis le lot 2 ; un compte au moins par rôle.
    expect(array_values(array_unique($roles, SORT_REGULAR)))->toEqualCanonicalizing(Role::cases());
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

    // 5 leçons du back-office (lot 1), 9 publiées pour l'élève (lot 2).
    expect($lecons)->toHaveCount(14)
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

test('le cours de démonstration côté élève : fictif, QCM valides, deux élèves aux profils différents', function () {
    $this->seed(DatabaseSeeder::class);
    $this->seed(DatabaseSeeder::class);

    $questions = Question::all();
    expect($questions->count())->toBeGreaterThan(10)
        ->and($questions->every(fn (Question $question) => $question->est_exemple))->toBeTrue();

    foreach ($questions as $question) {
        expect(FormatQuestion::erreur($question->type, $question->enonce, $question->donnees, $question->reponse_attendue))->toBeNull();
    }

    $aissatou = User::where('pseudo', 'aissatou_demo')->sole();
    $ousmane = User::where('pseudo', 'ousmane_demo')->sole();

    expect(CatalogueEleve::profil($aissatou)->libelleExamen())->toBe('BEPC')
        ->and(CatalogueEleve::profil($ousmane)->libelleExamen())->toBe('Bac SE')
        ->and(CatalogueEleve::lecons(CatalogueEleve::profil($aissatou))->count())->toBeGreaterThan(3)
        ->and(CatalogueEleve::questions(CatalogueEleve::profil($ousmane))->count())->toBeGreaterThan(3)
        // Historique semé une fois : le second passage n'ajoute rien.
        ->and(Tentative::where('user_id', $aissatou->id)->count())->toBe(6)
        ->and(Tentative::where('user_id', $ousmane->id)->count())->toBe(0);
});
