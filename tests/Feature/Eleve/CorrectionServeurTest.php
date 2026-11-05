<?php

use App\Enums\Role;
use App\Enums\TypeQuestion;
use App\Models\Question;
use App\Models\Seance;
use App\Models\Tentative;
use App\Models\User;
use App\Services\ContenuService;

/*
 * HORS_LIGNE.md A.14 n° 6 : la correction du serveur fait foi, contre la
 * **version vue** par l'élève (A.9). Tous les types passent par la file.
 */

beforeEach(function () {
    $this->eleve = eleveAvecProfil('BEPC');
    $this->jeton = appareilDe($this->eleve);
    $this->notion = notionDeTest();
});

function repondreParLaFile(object $test, Question $question, array $reponse, int $version = 1, array $extra = []): array
{
    $geste = geste($test->eleve, 'tentative.enregistrer', ['question' => $question->uuid, 'version' => $version, 'reponse' => $reponse, ...$extra]);
    $resultat = envoyer($test->jeton, [$geste])->assertOk()->json('resultats.0');

    return [...$resultat, 'uuid' => $geste['uuid']];
}

test('la version vue fait foi : une réponse juste en v1 le reste après la sortie d\'une v2', function () {
    $question = questionDeTest($this->notion);
    $redacteur = $question->auteur;
    $contenu = app(ContenuService::class);

    // L'équipe corrige la bonne réponse (« c » au lieu de « b ») et publie une v2.
    $question = $contenu->ouvrirModification($question, $redacteur);
    $champs = $question->contenuDuBrouillon();
    $question = $contenu->enregistrerQuestion($question, $redacteur, [...$champs, 'attendue' => ['option' => 'c']], $question->revision);
    $contenu->publier($contenu->soumettre($question, $redacteur), User::factory()->avecRole(Role::Relecteur)->create());

    // Hors ligne, l'élève avait répondu « b » à la v1 : juste.
    expect(repondreParLaFile($this, $question, ['option' => 'b'], 1)['resultat'])->toMatchArray(['score' => 100, 'correcte' => true, 'attendue' => ['option' => 'b']])
        // Sur la v2, « b » est faux.
        ->and(repondreParLaFile($this, $question, ['option' => 'b'], 2)['resultat'])->toMatchArray(['score' => 0, 'correcte' => false]);

    expect(Tentative::orderBy('id')->pluck('version')->all())->toBe([1, 2]);
});

test('une version jamais publiée (renvoyée, ou inventée) est refusée', function () {
    $question = questionDeTest($this->notion);
    $contenu = app(ContenuService::class);
    $redacteur = $question->auteur;

    $question = $contenu->ouvrirModification($question, $redacteur);
    $question = $contenu->soumettre($question, $redacteur);
    $contenu->renvoyer($question, User::factory()->avecRole(Role::Relecteur)->create(), 'À reprendre, merci.');

    expect(repondreParLaFile($this, $question, ['option' => 'b'], 2))->toMatchArray(['verdict' => 'rejetee', 'motif' => 'Cette version de la question n\'a jamais été publiée.'])
        ->and(repondreParLaFile($this, $question, ['option' => 'b'], 9)['verdict'])->toBe('rejetee')
        ->and(repondreParLaFile($this, $question, ['option' => 'b'], 1)['verdict'])->toBe('acceptee');
});

test('une question retirée n\'est plus proposée ; ses tentatives restent', function () {
    $question = questionDeTest($this->notion);
    repondreParLaFile($this, $question, ['option' => 'b']);

    app(ContenuService::class)->archiver($question, User::factory()->avecRole(Role::AdminContenu)->create());

    expect(repondreParLaFile($this, $question, ['option' => 'b'])['verdict'])->toBe('rejetee')
        ->and(Tentative::count())->toBe(1);
});

test('chaque type est recorrigé par le serveur, score partiel compris', function (TypeQuestion $type, array $donnees, array $attendue, array $reponse, int $score) {
    $question = questionPubliee($this->notion, $type, $donnees, $attendue);

    expect(repondreParLaFile($this, $question, $reponse)['resultat'])->toMatchArray(['score' => $score, 'correcte' => $score === 100]);

    // Relu en base (CLAUDE.md § 4).
    $tentative = Tentative::sole();
    expect($tentative->score)->toBe($score)
        ->and($tentative->correcte)->toBe($score === 100)
        ->and($tentative->reponse)->toBe($reponse);
})->with([
    'QCM à plusieurs réponses, en partie' => [TypeQuestion::QcmPlusieurs, ['options' => [['id' => 'a', 'texte' => '3'], ['id' => 'b', 'texte' => '−3'], ['id' => 'c', 'texte' => '9']]], ['options' => ['a', 'b']], ['options' => ['a']], 50],
    'vrai ou faux' => [TypeQuestion::VraiFaux, [], ['valeur' => true], ['valeur' => true], 100],
    'numérique, virgule' => [TypeQuestion::Numerique, ['unite' => 'cm'], ['valeur' => 2.5, 'tolerance' => 0, 'relative' => false], ['valeur' => '2,5'], 100],
    'courte, accents' => [TypeQuestion::Courte, [], ['acceptees' => ['hypoténuse']], ['texte' => 'HYPOTENUSE'], 100],
    'trous, un sur deux' => [TypeQuestion::Trous, ['segments' => [['texte' => 'Le côté '], ['trou' => 't1'], ['texte' => ' est opposé à l\'angle '], ['trou' => 't2', 'choix' => ['droit', 'aigu']]]], ['trous' => ['t1' => ['hypoténuse'], 't2' => ['droit']]], ['trous' => ['t1' => 'hypoténuse', 't2' => 'aigu']], 50],
    'appariement' => [TypeQuestion::Appariement, ['gauche' => [['id' => 'g1', 'texte' => 'U'], ['id' => 'g2', 'texte' => 'I']], 'droite' => [['id' => 'd1', 'texte' => 'A'], ['id' => 'd2', 'texte' => 'V']]], ['paires' => ['g1' => 'd2', 'g2' => 'd1']], ['paires' => ['g1' => 'd2', 'g2' => 'd1']], 100],
    'remise en ordre' => [TypeQuestion::Ordre, ['elements' => [['id' => 'e1', 'texte' => 'Un'], ['id' => 'e2', 'texte' => 'Deux'], ['id' => 'e3', 'texte' => 'Trois']]], ['ordre' => ['e1', 'e2', 'e3']], ['ordre' => ['e2', 'e1', 'e3']], 33],
]);

test('une réponse mal formée vaut 0, une réponse trop grosse est refusée', function () {
    $question = questionDeTest($this->notion);

    expect(repondreParLaFile($this, $question, ['option' => 'z'])['resultat']['score'])->toBe(0)
        ->and(repondreParLaFile($this, $question, ['texte' => str_repeat('a', 5000)])['verdict'])->toBe('rejetee')
        ->and(repondreParLaFile($this, $question, ['inconnue' => 'x'])['verdict'])->toBe('rejetee');
});

test('les indices ne retirent rien au verdict ; leur nombre est gardé, borné par la question', function () {
    $question = questionPubliee($this->notion, TypeQuestion::QcmUne, ['options' => [['id' => 'a', 'texte' => '4'], ['id' => 'b', 'texte' => '5']]], ['option' => 'b'], indices: [blocsDeTest('Indice 1'), blocsDeTest('Indice 2')]);

    expect(repondreParLaFile($this, $question, ['option' => 'b'], extra: ['indices_utilises' => 2])['resultat']['score'])->toBe(100)
        ->and(repondreParLaFile($this, $question, ['option' => 'b'], extra: ['indices_utilises' => 3])['resultat']['score'])->toBe(100);

    expect(Tentative::orderBy('id')->pluck('indices_utilises')->all())->toBe([2, 2]);
});

test('la séance livre la version publiée, éléments mélangés, jamais dans l\'ordre de la réponse', function () {
    $question = questionPubliee($this->notion, TypeQuestion::Ordre,
        ['elements' => [['id' => 'e1', 'texte' => 'Un'], ['id' => 'e2', 'texte' => 'Deux'], ['id' => 'e3', 'texte' => 'Trois'], ['id' => 'e4', 'texte' => 'Quatre']]],
        ['ordre' => ['e1', 'e2', 'e3', 'e4']]);

    $this->actingAs($this->eleve)->post(route('eleve.seance.commencer'));
    $seance = Seance::whereNotNull('jour')->sole();

    $this->actingAs($this->eleve)->get(route('eleve.seances.show', $seance))
        ->assertInertia(fn ($page) => $page
            ->where('questions.0.uuid', $question->uuid)
            ->where('questions.0.version', 1)
            ->where('questions.0.type', 'ordre')
            ->where('questions.0.corrige.0.titre', 'Calculer')
            ->where('questions.0.donnees.elements', fn ($elements) => collect($elements)->pluck('id')->all() !== ['e1', 'e2', 'e3', 'e4']
                && collect($elements)->pluck('id')->sort()->values()->all() === ['e1', 'e2', 'e3', 'e4']));
});
