<?php

use App\Enums\TypeQuestion;
use App\Support\BlocsContenu;
use App\Support\FormatQuestion;

/*
 * Correction des questions : même jeu d'exemples que l'appareil
 * (tests/js/contenu/questions.test.ts). Le serveur fait foi (HORS_LIGNE.md A.6).
 */

$exemples = fn () => json_decode((string) file_get_contents(__DIR__.'/../fixtures/questions.json'), true);

test("la correction du serveur et celle de l'appareil donnent les mêmes scores", function () use ($exemples) {
    foreach ($exemples()['corrections'] as $exemple) {
        expect(FormatQuestion::corriger(TypeQuestion::from($exemple['type']), $exemple['attendue'], $exemple['reponse']))
            ->toBe($exemple['score'], $exemple['nom']);
    }
});

test("auto-évaluation, normalisation des textes et lecture des nombres : mêmes exemples que l'appareil", function () use ($exemples) {
    $jeu = $exemples();

    foreach ($jeu['auto_evaluations'] as $exemple) {
        expect(FormatQuestion::scoreAutoEvaluation($exemple['donnees'], $exemple['criteres']))->toBe($exemple['score'], $exemple['nom']);
    }

    foreach ($jeu['normalisations'] as [$texte, $attendu]) {
        expect(FormatQuestion::normaliserTexte($texte))->toBe($attendu, $texte);
    }

    foreach ($jeu['nombres'] as [$texte, $attendu]) {
        expect(FormatQuestion::lireNombre($texte))->toBe($attendu === null ? null : (float) $attendu, $texte);
    }
});

test("chaque type couvert par le jeu d'exemples", function () use ($exemples) {
    $types = array_unique(array_column($exemples()['corrections'], 'type'));

    expect(collect(TypeQuestion::cases())->map->value->diff($types)->all())->toBe([]);
});

test('un QCM valide passe ; chaque défaut a sa raison', function () {
    $enonce = ['type' => 'doc', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'Question ?']]]]];
    $options = [['id' => 'a', 'texte' => 'Oui'], ['id' => 'b', 'texte' => '', 'latex' => 'x = 2']];
    $erreur = fn (array $donnees, array $attendue = ['option' => 'a'], ?array $doc = null) => FormatQuestion::erreur(TypeQuestion::QcmUne, $doc ?? $enonce, $donnees, $attendue);

    expect($erreur(['options' => $options]))->toBeNull()
        ->and($erreur(['options' => [$options[0]]]))->toBe('Un QCM a de 2 à 6 options.')
        ->and($erreur(['options' => [...$options, ['id' => 'a', 'texte' => 'Encore']]]))->toBe('Deux options ont la même lettre.')
        ->and($erreur(['options' => [['id' => 'z', 'texte' => 'Z'], $options[0]]]))->toBe('Chaque option a une lettre de a à f.')
        ->and($erreur(['options' => [['id' => 'c', 'texte' => ' '], $options[0]]]))->toBe('Chaque option a un texte ou une formule.')
        ->and($erreur(['options' => $options], ['option' => 'c']))->toBe('La bonne réponse doit être l\'une des options.')
        ->and($erreur(['options' => $options], doc: ['type' => 'doc', 'content' => [['type' => 'script']]]))->toBe('L\'énoncé n\'est pas un document valide.');
});

test('temps de lecture : 180 mots par minute, une minute au moins', function () {
    $paragraphe = fn (int $mots) => ['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => trim(str_repeat('mot ', $mots))]]];

    expect(BlocsContenu::minutesDeLecture(['type' => 'doc', 'content' => []]))->toBe(1)
        ->and(BlocsContenu::minutesDeLecture(['type' => 'doc', 'content' => [$paragraphe(180)]]))->toBe(1)
        ->and(BlocsContenu::minutesDeLecture(['type' => 'doc', 'content' => [$paragraphe(181)]]))->toBe(2)
        ->and(BlocsContenu::minutesDeLecture(['type' => 'doc', 'content' => [$paragraphe(175), ['type' => 'formuleBloc', 'attrs' => ['latex' => 'x']]]]))->toBe(2);
});
