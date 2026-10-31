<?php

use App\Enums\DecisionRelecture;
use App\Enums\Role;
use App\Enums\StatutContenu;
use App\Enums\TypeQuestion;
use App\Models\Question;
use App\Models\User;
use App\Services\ContenuService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Validation\ValidationException;

/*
 * Les questions suivent le circuit des leçons (PLAN M17) : brouillon →
 * relecture → publication, versions figées, jamais relues par leur auteur.
 * Une version fige ensemble énoncé, données, réponse, indices et corrigé
 * (HORS_LIGNE.md A.9).
 */

beforeEach(function () {
    $this->contenu = app(ContenuService::class);
    $this->notion = notionDeTest();
    $this->redacteur = User::factory()->avecRole(Role::Redacteur)->create();
    $this->relecteur = User::factory()->avecRole(Role::Relecteur)->create();
    $this->pedagogie = User::factory()->avecRole(Role::AdminContenu)->create();
});

function champsQcm(string $bonne = 'b', array $indices = []): array
{
    return [
        'enonce' => blocsDeTest('Combien mesure l\'hypoténuse ?'),
        'donnees' => ['options' => [['id' => 'a', 'texte' => '4 cm'], ['id' => 'b', 'texte' => '5 cm'], ['id' => 'c', 'texte' => '7 cm']]],
        'attendue' => ['option' => $bonne],
        'indices' => $indices,
        'corrige' => [['titre' => 'Calculer', 'blocs' => blocsDeTest('3² + 4² = 25.')], ['titre' => '', 'blocs' => blocsDeTest('Donc 5 cm.')]],
        'difficulte' => 3,
    ];
}

test('un rédacteur écrit une question, un autre la publie : la version fige tout ensemble', function () {
    $question = $this->contenu->creerQuestion($this->redacteur, $this->notion, TypeQuestion::QcmUne);
    $question = $this->contenu->enregistrerQuestion($question, $this->redacteur, champsQcm(indices: [blocsDeTest('Pense à Pythagore.')]), 0);
    $question = $this->contenu->publier($this->contenu->soumettre($question, $this->redacteur), $this->relecteur, 'Juste.');

    // Relu en base (CLAUDE.md § 4).
    $question->refresh();
    $version = $question->versionPubliee;

    expect($question->statut)->toBe(StatutContenu::Publie)
        ->and($question->auteur_id)->toBe($this->redacteur->id)
        ->and($question->extrait)->toStartWith('Combien mesure l\'hypoténuse ?')
        ->and($question->difficulte)->toBe(3)
        ->and($version->numero)->toBe(1)
        ->and($version->decision)->toBe(DecisionRelecture::Publiee)
        ->and($version->titre)->toStartWith('Combien mesure')
        ->and($version->blocs['type'])->toBe('qcm_une')
        ->and($version->blocs['attendue'])->toBe(['option' => 'b'])
        ->and($version->blocs['indices'])->toHaveCount(1)
        ->and($version->blocs['corrige'])->toHaveCount(2)
        ->and($version->blocs['corrige'][0]['titre'])->toBe('Calculer');
});

test('l\'auteur ne relit pas sa question, même responsable pédagogique', function () {
    $question = $this->contenu->creerQuestion($this->pedagogie, $this->notion, TypeQuestion::QcmUne);
    $question = $this->contenu->enregistrerQuestion($question, $this->pedagogie, champsQcm(), 0);
    $question = $this->contenu->soumettre($question, $this->pedagogie);

    expect(fn () => $this->contenu->publier($question, $this->pedagogie))
        ->toThrow(AuthorizationException::class, 'Vous avez écrit cette question');

    expect(fn () => $this->contenu->creerQuestion($this->relecteur, $this->notion, TypeQuestion::QcmUne))
        ->toThrow(AuthorizationException::class);

    expect($question->fresh()->statut)->toBe(StatutContenu::EnRelecture);
});

test('un brouillon incomplet s\'enregistre, mais ne part pas en relecture : la raison est donnée', function () {
    $question = $this->contenu->creerQuestion($this->redacteur, $this->notion, TypeQuestion::QcmUne);

    expect(fn () => $this->contenu->soumettre($question, $this->redacteur))
        ->toThrow(ValidationException::class, 'sans énoncé');

    // Options pas encore écrites : le brouillon est gardé.
    $champs = champsQcm();
    $champs['donnees'] = ['options' => [['id' => 'a', 'texte' => ''], ['id' => 'b', 'texte' => '']]];
    $question = $this->contenu->enregistrerQuestion($question, $this->redacteur, $champs, 0);

    expect($question->fresh()->revision)->toBe(1)
        ->and(fn () => $this->contenu->soumettre($question, $this->redacteur))
        ->toThrow(ValidationException::class, 'texte ou une formule');

    $sansCorrige = champsQcm();
    $sansCorrige['corrige'] = [];
    $question = $this->contenu->enregistrerQuestion($question, $this->redacteur, $sansCorrige, 1);

    expect(fn () => $this->contenu->soumettre($question, $this->redacteur))
        ->toThrow(ValidationException::class, 'au moins une étape');
});

test('un document mal formé n\'est jamais enregistré ; deux onglets ne s\'écrasent pas', function () {
    $question = $this->contenu->creerQuestion($this->redacteur, $this->notion, TypeQuestion::QcmUne);
    $champs = champsQcm();
    $champs['enonce'] = ['type' => 'doc', 'content' => [['type' => 'script']]];

    expect(fn () => $this->contenu->enregistrerQuestion($question, $this->redacteur, $champs, 0))
        ->toThrow(ValidationException::class);

    $this->contenu->enregistrerQuestion($question, $this->redacteur, champsQcm(), 0);

    expect(fn () => $this->contenu->enregistrerQuestion($question, $this->redacteur, champsQcm('c'), 0))
        ->toThrow(ValidationException::class, 'enregistrée ailleurs');

    expect($question->fresh()->reponse_attendue)->toBe(['option' => 'b']);
});

test('les indices et étapes laissés vides ne sont pas gardés', function () {
    $question = $this->contenu->creerQuestion($this->redacteur, $this->notion, TypeQuestion::QcmUne);
    $champs = champsQcm(indices: [['type' => 'doc', 'content' => []], blocsDeTest('Un vrai indice.')]);
    $champs['corrige'][] = ['titre' => 'Vide', 'blocs' => ['type' => 'doc', 'content' => []]];

    $question = $this->contenu->enregistrerQuestion($question, $this->redacteur, $champs, 0)->fresh();

    expect($question->indices)->toHaveCount(1)
        ->and($question->corrige)->toHaveCount(2);
});

test('modifier une question publiée garde la version en ligne jusqu\'à la suivante', function () {
    $question = questionDeTest($this->notion);
    $redacteur = $question->auteur;

    $question = $this->contenu->ouvrirModification($question, $redacteur);
    $question = $this->contenu->enregistrerQuestion($question, $redacteur, champsQcm('c'), $question->revision);

    expect($question->fresh()->statut)->toBe(StatutContenu::Brouillon)
        ->and($question->fresh()->versionPubliee->blocs['attendue'])->toBe(['option' => 'b']);

    $question = $this->contenu->publier($this->contenu->soumettre($question, $redacteur), $this->relecteur)->fresh();

    expect($question->versionPubliee->numero)->toBe(2)
        ->and($question->versionPubliee->blocs['attendue'])->toBe(['option' => 'c'])
        ->and($question->versions()->count())->toBe(2);
});

test('archiver retire la question des élèves ; seul le responsable pédagogique le fait', function () {
    $question = questionDeTest($this->notion);

    expect(fn () => $this->contenu->archiver($question, $this->redacteur))->toThrow(AuthorizationException::class);

    $this->contenu->archiver($question, $this->pedagogie);
    expect($question->fresh()->statut)->toBe(StatutContenu::Archive);

    $this->contenu->restaurer($question, $this->pedagogie);
    expect($question->fresh()->statut)->toBe(StatutContenu::Brouillon)
        ->and(Question::sole()->version_publiee_id)->not->toBeNull();
});
