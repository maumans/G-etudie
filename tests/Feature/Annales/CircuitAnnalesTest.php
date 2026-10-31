<?php

use App\Enums\Filiere;
use App\Enums\Role;
use App\Enums\StatutContenu;
use App\Enums\TypeQuestion;
use App\Enums\TypeSujet;
use App\Models\Examen;
use App\Models\Matiere;
use App\Models\Question;
use App\Models\Sujet;
use App\Models\User;
use App\Services\Annales\SujetService;
use App\Services\ContenuService;
use App\Support\CatalogueEleve;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Validation\ValidationException;

/*
 * Une annale se relit avec toutes ses questions (SujetService) : un seul
 * geste du relecteur, jamais l'auteur ; une question d'annale ne se relit
 * pas seule ; archivée, l'annale disparaît du catalogue, ses questions
 * aussi.
 */

beforeEach(function () {
    $this->notion = notionDeTest();
    $this->sujets = app(SujetService::class);
    $this->contenu = app(ContenuService::class);
    $this->redacteur = User::factory()->avecRole(Role::Redacteur)->create();
    $this->relecteur = User::factory()->avecRole(Role::Relecteur)->create();
    $this->pedagogie = User::factory()->avecRole(Role::AdminContenu)->create();
});

/** Une annale de BEPC en brouillon, avec une question complète (QCM, corrigé). */
function annaleDeTest(object $test, int $questions = 1): Sujet
{
    $sujet = $test->sujets->creer($test->redacteur, [
        'examen' => Examen::where('code', 'BEPC')->sole(),
        'serie' => null,
        'matiere' => Matiere::where('slug', 'maths')->sole(),
        'filiere' => Filiere::Generale,
        'session' => 2021,
        'type' => TypeSujet::Officiel,
        'titre' => 'Mathématiques BEPC 2021',
    ]);
    $partie = $test->sujets->ajouterPartie($sujet, $test->redacteur, 'Exercice 1', 4);

    for ($i = 0; $i < $questions; $i++) {
        $question = $test->sujets->ajouterQuestion($partie, $test->redacteur, $test->notion, TypeQuestion::QcmUne);
        $test->contenu->enregistrerQuestion($question, $test->redacteur, [
            'enonce' => blocsDeTest('Combien mesure l\'hypoténuse ?'),
            'donnees' => ['options' => [['id' => 'a', 'texte' => '4 cm'], ['id' => 'b', 'texte' => '5 cm']]],
            'attendue' => ['option' => 'b'],
            'indices' => [],
            'corrige' => [['titre' => 'Pythagore', 'blocs' => blocsDeTest('9 + 16 = 25.')]],
            'difficulte' => 2,
        ], 0);
    }

    return $sujet->fresh();
}

test('le relecteur publie l\'annale et toutes ses questions d\'un geste ; la version fige la structure', function () {
    $sujet = annaleDeTest($this, 2);
    $sujet = $this->sujets->publier($this->sujets->soumettre($sujet, $this->redacteur), $this->relecteur, 'Juste.');

    $version = $sujet->fresh()->versionPubliee;
    $questions = $sujet->questions()->get();

    expect($sujet->fresh()->statut)->toBe(StatutContenu::Publie)
        ->and($questions->every(fn (Question $q) => $q->statut === StatutContenu::Publie && $q->version_publiee_id !== null))->toBeTrue()
        ->and($version->blocs['parties'])->toHaveCount(1)
        ->and($version->blocs['parties'][0]['bareme'])->toEqual(4)
        ->and($version->blocs['parties'][0]['questions'])->toBe($questions->pluck('uuid')->all());
});

test('l\'auteur ne relit pas son annale ; le renvoi rend tout au brouillon', function () {
    $sujet = $this->sujets->soumettre(annaleDeTest($this), $this->redacteur);

    expect(fn () => $this->sujets->publier($sujet, $this->redacteur))
        ->toThrow(AuthorizationException::class);
    expect($sujet->fresh()->statut)->toBe(StatutContenu::EnRelecture);

    $this->sujets->renvoyer($sujet, $this->relecteur, 'La question 1 manque d\'unité.');

    expect($sujet->fresh()->statut)->toBe(StatutContenu::Brouillon)
        ->and($sujet->questions()->first()->statut)->toBe(StatutContenu::Brouillon)
        ->and($sujet->fresh()->dernierRenvoi()->commentaire)->toBe('La question 1 manque d\'unité.');
});

test('une question incomplète bloque l\'envoi de l\'annale, avec son numéro ; rien n\'est envoyé', function () {
    $sujet = annaleDeTest($this);
    $this->sujets->ajouterQuestion($sujet->parties()->first(), $this->redacteur, $this->notion, TypeQuestion::Numerique);

    expect(fn () => $this->sujets->soumettre($sujet->fresh(), $this->redacteur))
        ->toThrow(ValidationException::class, 'Question 2 :');

    expect($sujet->fresh()->statut)->toBe(StatutContenu::Brouillon)
        ->and(Question::query()->where('statut', StatutContenu::EnRelecture->value)->count())->toBe(0);
});

test('une question d\'annale ne se relit pas seule, ni ne part seule en relecture', function () {
    $sujet = annaleDeTest($this);
    $question = $sujet->questions()->first();

    $this->actingAs($this->redacteur)->post(route('contenu.questions.soumettre', $question))
        ->assertForbidden();

    $this->sujets->soumettre($sujet, $this->redacteur);

    // Elle n'est pas dans la file des questions, mais l'annale est dans la sienne.
    $this->actingAs($this->relecteur)->get(route('contenu.questions.relecture'))
        ->assertInertia(fn ($page) => $page->where('questions.total', 0)->where('annales_a_relire', 1));
    $this->post(route('contenu.questions.publier', $question))->assertForbidden();
});

test('retirer une question jamais publiée la supprime ; une question publiée reste', function () {
    $sujet = annaleDeTest($this, 2);
    [$premiere, $seconde] = $sujet->questions()->get()->all();

    $this->actingAs($this->redacteur)->delete(route('contenu.annales.questions.destroy', $premiere))->assertRedirect();
    expect(Question::query()->find($premiere->id))->toBeNull();

    $this->sujets->publier($this->sujets->soumettre($sujet->fresh(), $this->redacteur), $this->relecteur);
    $this->contenu->ouvrirModification($sujet->fresh(), $this->redacteur);

    $this->delete(route('contenu.annales.questions.destroy', $seconde))
        ->assertSessionHasErrors(['question' => 'Une question déjà publiée ne se retire pas : archivez-la depuis sa fiche.']);
});

test('archivée, l\'annale sort du catalogue de l\'élève, ses questions aussi', function () {
    $sujet = $this->sujets->publier($this->sujets->soumettre(annaleDeTest($this), $this->redacteur), $this->relecteur);
    $eleve = eleveAvecProfil('BEPC');
    $profil = CatalogueEleve::profil($eleve);

    expect(CatalogueEleve::sujets($profil)->count())->toBe(1)
        ->and(CatalogueEleve::questions($profil)->whereNotNull('sujet_partie_id')->count())->toBe(1);

    $this->contenu->archiver($sujet->fresh(), $this->pedagogie);

    expect(CatalogueEleve::sujets($profil)->count())->toBe(0)
        ->and(CatalogueEleve::questions($profil)->whereNotNull('sujet_partie_id')->count())->toBe(0);
    $this->actingAs($eleve)->get(route('eleve.annales.show', $sujet))->assertNotFound();
});

test('une partie se modifie en brouillon seulement, avec une consigne valide', function () {
    $sujet = annaleDeTest($this);
    $partie = $sujet->parties()->first();

    $this->actingAs($this->redacteur)->put(route('contenu.annales.parties.update', $partie), [
        'titre' => 'Exercice 1 (révisé)', 'bareme' => 4.5, 'consigne' => blocsDeTest('Soit ABC un triangle.'),
    ])->assertRedirect();

    expect($partie->fresh()->titre)->toBe('Exercice 1 (révisé)')
        ->and($partie->fresh()->bareme)->toBe('4.50')
        ->and($partie->fresh()->consigne)->toEqual(blocsDeTest('Soit ABC un triangle.'));

    $this->put(route('contenu.annales.parties.update', $partie), [
        'titre' => 'X', 'bareme' => null, 'consigne' => ['type' => 'doc', 'content' => [['type' => 'script']]],
    ])->assertSessionHasErrors('consigne');

    // En relecture, plus de retouche.
    $this->sujets->soumettre($sujet->fresh(), $this->redacteur);
    $this->put(route('contenu.annales.parties.update', $partie), ['titre' => 'Autre', 'bareme' => null, 'consigne' => blocsDeTest()])
        ->assertSessionHasErrors('statut');
});

test('un autre rédacteur consulte l\'annale mais ne la modifie pas', function () {
    $sujet = annaleDeTest($this);
    $autre = User::factory()->avecRole(Role::Redacteur)->create();

    $this->actingAs($autre)->get(route('contenu.annales.show', $sujet))->assertOk()
        ->assertInertia(fn ($page) => $page->component('contenu/annales/fiche')->where('droits.rediger', false));
    $this->put(route('contenu.annales.update', $sujet), ['titre' => 'Piraté', 'session' => 2021, 'revision' => $sujet->revision])
        ->assertForbidden();

    // Un élève n'entre pas dans le back-office (le `can:` de la route).
    $this->actingAs(eleveAvecProfil('BEPC'))->get(route('contenu.annales.show', $sujet))->assertForbidden();
});
