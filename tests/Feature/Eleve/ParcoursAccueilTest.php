<?php

use App\Enums\Filiere;
use App\Enums\Role;
use App\Models\Etablissement;
use App\Models\Examen;
use App\Models\ProfilEleve;
use App\Models\Seance;
use App\Models\Serie;
use App\Models\User;
use Database\Seeders\ReferentielSeeder;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(fn () => $this->seed(ReferentielSeeder::class));

test('un nouvel élève arrive sur le parcours d\'accueil, pas sur un tableau vide', function () {
    $eleve = User::factory()->sansProfil()->create();

    $this->actingAs($eleve)->get('/eleve')->assertRedirect(route('eleve.bienvenue'));
    $this->actingAs($eleve)->get(route('eleve.cours'))->assertRedirect(route('eleve.bienvenue'));

    $this->actingAs($eleve)->get(route('eleve.bienvenue'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('eleve/bienvenue')
            ->has('examens', 3)
            ->where('examens.2.code', 'BAC')
            ->has('examens.2.series', 3)
            ->has('examens.1.series', 0)
            ->where('etablissements', [])
            ->where('objectifs.1', ['minutes' => 15, 'questions' => 8])
            ->where('profil', null));
});

test('par l\'écran : choisir le BEPC enregistre le profil et ouvre le premier exercice', function () {
    questionDeTest(notionDeTest());
    $eleve = User::factory()->sansProfil()->create();
    $bepc = Examen::where('code', 'BEPC')->sole();

    $reponse = $this->actingAs($eleve)->put(route('eleve.bienvenue.update'), [
        'examen' => $bepc->id,
        'objectif' => 10,
    ]);

    $profil = ProfilEleve::sole();
    $seance = Seance::sole();
    $reponse->assertRedirect(route('eleve.seances.show', $seance));

    // Relu en base (CLAUDE.md § 4 : `$fillable` incomplet = valeur perdue).
    expect($profil->user_id)->toBe($eleve->id)
        ->and($profil->examen_id)->toBe($bepc->id)
        ->and($profil->serie_id)->toBeNull()
        ->and($profil->classe->nom)->toBe('10e année')
        ->and($profil->filiere)->toBe(Filiere::Generale)
        ->and($profil->objectif_minutes)->toBe(10)
        ->and($seance->user_id)->toBe($eleve->id)
        ->and($seance->questions)->toHaveCount(1);
});

test('le Bac exige une série, le BEPC la refuse', function () {
    $eleve = User::factory()->sansProfil()->create();
    $bac = Examen::where('code', 'BAC')->sole();
    $bepc = Examen::where('code', 'BEPC')->sole();
    $se = Serie::where('code', 'SE')->sole();

    $this->actingAs($eleve)->put(route('eleve.bienvenue.update'), ['examen' => $bac->id, 'objectif' => 15])
        ->assertSessionHasErrors(['serie' => 'Choisis ta série.']);
    $this->actingAs($eleve)->put(route('eleve.bienvenue.update'), ['examen' => $bepc->id, 'serie' => $se->id, 'objectif' => 15])
        ->assertSessionHasErrors('serie');
    $this->actingAs($eleve)->put(route('eleve.bienvenue.update'), ['examen' => $bepc->id, 'objectif' => 20])
        ->assertSessionHasErrors('objectif');
    $this->actingAs($eleve)->put(route('eleve.bienvenue.update'), ['examen' => 9999, 'objectif' => 15])
        ->assertSessionHasErrors('examen');

    expect(ProfilEleve::count())->toBe(0);

    $this->actingAs($eleve)->put(route('eleve.bienvenue.update'), ['examen' => $bac->id, 'serie' => $se->id, 'objectif' => 30]);

    expect(ProfilEleve::sole()->serie_id)->toBe($se->id)
        ->and(ProfilEleve::sole()->classe->nom)->toBe('Terminale');
});

test('sans question publiée, le parcours mène à l\'accueil', function () {
    $eleve = User::factory()->sansProfil()->create();

    $this->actingAs($eleve)
        ->put(route('eleve.bienvenue.update'), ['examen' => Examen::where('code', 'BEPC')->value('id'), 'objectif' => 15])
        ->assertRedirect(route('eleve.accueil'));

    expect(Seance::count())->toBe(0);
});

test('changer d\'examen depuis l\'accueil garde la filière et ne relance pas de séance', function () {
    $eleve = eleveAvecProfil('BEPC');
    questionDeTest(notionDeTest());
    $eleve->profilEleve->update(['filiere' => Filiere::FrancoArabe]);
    $bac = Examen::where('code', 'BAC')->sole();

    $this->actingAs($eleve)->get(route('eleve.bienvenue'))
        ->assertInertia(fn (Assert $page) => $page->where('profil.objectif_minutes', 15));

    $this->actingAs($eleve)
        ->put(route('eleve.bienvenue.update'), ['examen' => $bac->id, 'serie' => Serie::where('code', 'SM')->value('id'), 'objectif' => 30])
        ->assertRedirect(route('eleve.accueil'));

    $profil = $eleve->profilEleve()->sole();
    expect($profil->examen_id)->toBe($bac->id)
        ->and($profil->filiere)->toBe(Filiere::FrancoArabe)
        ->and(ProfilEleve::count())->toBe(1)
        ->and(Seance::count())->toBe(0);
});

test('un établissement inconnu est refusé ; un établissement de la liste est gardé', function () {
    $eleve = User::factory()->sansProfil()->create();
    $bepc = Examen::where('code', 'BEPC')->value('id');
    $lycee = Etablissement::create(['nom' => 'Lycée de démonstration', 'type' => 'public']);

    $this->actingAs($eleve)->get(route('eleve.bienvenue'))
        ->assertInertia(fn (Assert $page) => $page->has('etablissements', 1));

    $this->actingAs($eleve)->put(route('eleve.bienvenue.update'), ['examen' => $bepc, 'etablissement' => 9999, 'objectif' => 15])
        ->assertSessionHasErrors('etablissement');
    $this->actingAs($eleve)->put(route('eleve.bienvenue.update'), ['examen' => $bepc, 'etablissement' => $lycee->id, 'objectif' => 15]);

    expect(ProfilEleve::sole()->etablissement_id)->toBe($lycee->id);
});

test('le personnel n\'a pas de parcours d\'accueil élève', function () {
    $redacteur = User::factory()->avecRole(Role::Redacteur)->create();

    $this->actingAs($redacteur)->get(route('eleve.bienvenue'))->assertForbidden();
});
