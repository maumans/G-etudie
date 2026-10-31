<?php

use App\Enums\TypeQuestion;
use App\Services\Annales\PropositionEnQuestion;
use App\Support\BlocsContenu;
use App\Support\FormatQuestion;
use App\Support\TexteEnBlocs;

/*
 * Du texte transcrit par l'IA au format des blocs (TexteEnBlocs), et d'une
 * question proposée à une question valide (PropositionEnQuestion) : le
 * résultat est toujours un document valide, l'énoncé n'est jamais perdu.
 */

test('paragraphes, formules en ligne et centrées, listes', function () {
    $doc = TexteEnBlocs::convertir("Soit \$f(x) = 2x\$.\nOn pose :\n\n\$\$x^2 + 1\$\$\n\n- premier point\n- second \$a\$\n\n1. un\n2. deux");

    expect(BlocsContenu::erreur($doc))->toBeNull()
        ->and(array_column($doc['content'], 'type'))->toBe(['paragraph', 'formuleBloc', 'bulletList', 'orderedList'])
        ->and($doc['content'][0]['content'][1])->toBe(['type' => 'formule', 'attrs' => ['latex' => 'f(x) = 2x']])
        ->and($doc['content'][0]['content'][3])->toBe(['type' => 'hardBreak'])
        ->and($doc['content'][1]['attrs']['latex'])->toBe('x^2 + 1')
        ->and($doc['content'][2]['content'])->toHaveCount(2);
});

test('texte vide, dollar isolé, formule trop longue : toujours valide', function () {
    expect(TexteEnBlocs::convertir('  '))->toBe(BlocsContenu::vide());

    foreach (['Le prix est de 5 $ seulement.', '$'.str_repeat('x', 1200).'$', '$$ $$'] as $texte) {
        expect(BlocsContenu::erreur(TexteEnBlocs::convertir($texte)))->toBeNull();
    }
});

test('chaque type proposé devient une question valide', function (array $proposition, TypeQuestion $type) {
    $q = PropositionEnQuestion::convertir([
        'enonce' => 'Énoncé', 'options' => [], 'bonnes_options' => [], 'vrai' => null, 'valeur' => null,
        'unite' => null, 'tolerance' => null, 'acceptees' => [], 'bareme' => [], 'corrige' => [['titre' => 'Étape', 'texte' => 'Parce que.']],
        'notion_id' => 1, 'difficulte' => 2, ...$proposition,
    ]);

    expect($q['type'])->toBe($type)
        ->and($q['avertissement'])->toBeNull()
        ->and(FormatQuestion::erreur($q['type'], $q['enonce'], $q['donnees'], $q['attendue']))->toBeNull()
        ->and(FormatQuestion::erreurAides([], $q['corrige']))->toBeNull();
})->with([
    'qcm à une réponse' => [['type' => 'qcm_une', 'options' => ['a', '$\\frac{1}{2}$'], 'bonnes_options' => [1]], TypeQuestion::QcmUne],
    'qcm à plusieurs' => [['type' => 'qcm_plusieurs', 'options' => ['a', 'b', 'c'], 'bonnes_options' => [0, 2]], TypeQuestion::QcmPlusieurs],
    'vrai ou faux' => [['type' => 'vrai_faux', 'vrai' => false], TypeQuestion::VraiFaux],
    'numérique, virgule et espace' => [['type' => 'numerique', 'valeur' => '1 250,5', 'unite' => 'm', 'tolerance' => '0,5'], TypeQuestion::Numerique],
    'réponse courte' => [['type' => 'courte', 'acceptees' => ['homozygote']], TypeQuestion::Courte],
    'ouverte' => [['type' => 'ouverte', 'bareme' => [['critere' => 'Cite la loi.', 'points' => 2]]], TypeQuestion::Ouverte],
]);

test('une option qui n\'est qu\'une formule s\'affiche en formule ; un nombre lu avec sa virgule', function () {
    $qcm = PropositionEnQuestion::convertir(['enonce' => 'x', 'type' => 'qcm_une', 'options' => ['$\\frac{3}{5}$', '4/5'], 'bonnes_options' => [0]]);
    $nombre = PropositionEnQuestion::convertir(['enonce' => 'x', 'type' => 'numerique', 'valeur' => '3,70', 'tolerance' => null]);

    expect($qcm['donnees']['options'][0])->toBe(['id' => 'a', 'texte' => '', 'latex' => '\\frac{3}{5}'])
        ->and($nombre['attendue'])->toBe(['valeur' => 3.7, 'tolerance' => 0, 'relative' => false]);
});

test('une proposition incohérente passe en question ouverte, avec un avertissement', function (array $proposition) {
    $q = PropositionEnQuestion::convertir(['enonce' => 'Calcule $x$.', ...$proposition]);

    expect($q['type'])->toBe(TypeQuestion::Ouverte)
        ->and($q['avertissement'])->not->toBeNull()
        ->and(FormatQuestion::erreur($q['type'], $q['enonce'], $q['donnees'], $q['attendue']))->toBeNull()
        ->and($q['enonce']['content'][0]['content'][1]['type'])->toBe('formule');
})->with([
    'qcm à une seule option' => [['type' => 'qcm_une', 'options' => ['9'], 'bonnes_options' => [0]]],
    'qcm à deux bonnes réponses' => [['type' => 'qcm_une', 'options' => ['a', 'b'], 'bonnes_options' => [0, 1]]],
    'nombre illisible' => [['type' => 'numerique', 'valeur' => 'environ dix']],
    'type inconnu' => [['type' => 'dessin']],
    'ouverte sans barème' => [['type' => 'ouverte', 'bareme' => []]],
]);
