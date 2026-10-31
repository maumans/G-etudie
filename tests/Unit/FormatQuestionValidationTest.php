<?php

use App\Enums\TypeQuestion;
use App\Support\FormatQuestion;

/*
 * Ce qu'une question doit être pour partir en relecture, type par type
 * (FormatQuestion::erreur) : un exemple valide, et chaque défaut avec sa
 * raison, dite à l'auteur.
 */

$enonce = ['type' => 'doc', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'Question ?']]]]];
$el = fn (string $id, string $texte = 'x') => ['id' => $id, 'texte' => $texte];

test('un exemple valide de chaque type passe', function (TypeQuestion $type, array $donnees, array $attendue) use ($enonce) {
    expect(FormatQuestion::erreur($type, $enonce, $donnees, $attendue))->toBeNull();
})->with([
    'qcm_une' => [TypeQuestion::QcmUne, ['options' => [['id' => 'a', 'texte' => 'Oui'], ['id' => 'b', 'texte' => '', 'latex' => 'x = 2']]], ['option' => 'a']],
    'qcm_plusieurs' => [TypeQuestion::QcmPlusieurs, ['options' => [['id' => 'a', 'texte' => '3'], ['id' => 'b', 'texte' => '-3'], ['id' => 'c', 'texte' => '9']]], ['options' => ['a', 'b']]],
    'vrai_faux' => [TypeQuestion::VraiFaux, [], ['valeur' => false]],
    'numerique' => [TypeQuestion::Numerique, ['unite' => 'cm'], ['valeur' => 2.5, 'tolerance' => 0.1, 'relative' => false]],
    'courte' => [TypeQuestion::Courte, [], ['acceptees' => ['Conakry']]],
    'trous' => [TypeQuestion::Trous, ['segments' => [['texte' => 'Le '], ['trou' => 't1'], ['texte' => ' et '], ['trou' => 't2', 'choix' => ['a', 'b']]]], ['trous' => ['t1' => ['chat'], 't2' => ['b']]]],
    'appariement' => [TypeQuestion::Appariement, ['gauche' => [['id' => 'g1', 'texte' => 'U'], ['id' => 'g2', 'texte' => 'I']], 'droite' => [['id' => 'd1', 'texte' => 'A'], ['id' => 'd2', 'texte' => 'V'], ['id' => 'd3', 'texte' => 'W']]], ['paires' => ['g1' => 'd2', 'g2' => 'd1']]],
    'ordre' => [TypeQuestion::Ordre, ['elements' => [['id' => 'e1', 'texte' => 'Un'], ['id' => 'e2', 'texte' => 'Deux']]], ['ordre' => ['e2', 'e1']]],
    'ouverte' => [TypeQuestion::Ouverte, ['bareme' => [['id' => 'c1', 'critere' => 'Je cite la règle.', 'points' => 2]]], []],
]);

test('chaque défaut a sa raison', function (TypeQuestion $type, array $donnees, array $attendue, string $raison) use ($enonce) {
    expect(FormatQuestion::erreur($type, $enonce, $donnees, $attendue))->toContain($raison);
})->with([
    'QCM multiple sans bonne réponse' => [TypeQuestion::QcmPlusieurs, ['options' => [['id' => 'a', 'texte' => '1'], ['id' => 'b', 'texte' => '2']]], ['options' => []], 'au moins une bonne réponse'],
    'QCM multiple : réponse hors des options' => [TypeQuestion::QcmPlusieurs, ['options' => [['id' => 'a', 'texte' => '1'], ['id' => 'b', 'texte' => '2']]], ['options' => ['c']], 'parmi les options'],
    'vrai/faux sans réponse' => [TypeQuestion::VraiFaux, [], [], 'vraie ou fausse'],
    'numérique sans valeur' => [TypeQuestion::Numerique, [], ['tolerance' => 0, 'relative' => false], 'valeur attendue'],
    'numérique, tolérance négative' => [TypeQuestion::Numerique, [], ['valeur' => 1, 'tolerance' => -1, 'relative' => false], 'positif ou nul'],
    'numérique, pourcentage énorme' => [TypeQuestion::Numerique, [], ['valeur' => 1, 'tolerance' => 80, 'relative' => true], '50 %'],
    'courte sans forme' => [TypeQuestion::Courte, [], ['acceptees' => []], 'de 1 à 10 formes'],
    'courte, forme vide' => [TypeQuestion::Courte, [], ['acceptees' => ['  !  ']], 'vide ou trop longue'],
    'trous sans trou' => [TypeQuestion::Trous, ['segments' => [['texte' => 'Rien']]], ['trous' => []], 'au moins un trou'],
    'trous, réponse manquante' => [TypeQuestion::Trous, ['segments' => [['trou' => 't1'], ['trou' => 't2']]], ['trous' => ['t1' => ['a']]], 'Chaque trou a sa réponse'],
    'trous, réponse hors de la liste' => [TypeQuestion::Trous, ['segments' => [['trou' => 't1', 'choix' => ['a', 'b']]]], ['trous' => ['t1' => ['c']]], 'l\'une de ses propositions'],
    'trous, deux fois le même' => [TypeQuestion::Trous, ['segments' => [['trou' => 't1'], ['trou' => 't1']]], ['trous' => ['t1' => ['a']]], 'même repère'],
    'appariement, droite trop courte' => [TypeQuestion::Appariement, ['gauche' => [['id' => 'g1', 'texte' => 'a'], ['id' => 'g2', 'texte' => 'b'], ['id' => 'g3', 'texte' => 'c']], 'droite' => [['id' => 'd1', 'texte' => 'x'], ['id' => 'd2', 'texte' => 'y']]], ['paires' => []], 'autant d\'éléments à droite'],
    'appariement, paire manquante' => [TypeQuestion::Appariement, ['gauche' => [['id' => 'g1', 'texte' => 'a'], ['id' => 'g2', 'texte' => 'b']], 'droite' => [['id' => 'd1', 'texte' => 'x'], ['id' => 'd2', 'texte' => 'y']]], ['paires' => ['g1' => 'd1']], 'Chaque élément de gauche'],
    'appariement, même cible deux fois' => [TypeQuestion::Appariement, ['gauche' => [['id' => 'g1', 'texte' => 'a'], ['id' => 'g2', 'texte' => 'b']], 'droite' => [['id' => 'd1', 'texte' => 'x'], ['id' => 'd2', 'texte' => 'y']]], ['paires' => ['g1' => 'd1', 'g2' => 'd1']], 'même élément de droite'],
    'ordre incomplet' => [TypeQuestion::Ordre, ['elements' => [['id' => 'e1', 'texte' => 'a'], ['id' => 'e2', 'texte' => 'b']]], ['ordre' => ['e1']], 'chaque élément une fois'],
    'ordre, élément vide' => [TypeQuestion::Ordre, ['elements' => [['id' => 'e1', 'texte' => ''], ['id' => 'e2', 'texte' => 'b']]], ['ordre' => ['e1', 'e2']], 'un texte ou une formule'],
    'barème vide' => [TypeQuestion::Ouverte, ['bareme' => []], [], 'de 1 à 8 critères'],
    'critère à 0 point' => [TypeQuestion::Ouverte, ['bareme' => [['id' => 'c1', 'critere' => 'Je cite.', 'points' => 0]]], [], 'de 1 à 10 points'],
]);

test('un énoncé ne contient pas de mini-question ; les aides sont bornées', function () use ($enonce) {
    $avecQuestion = ['type' => 'doc', 'content' => [['type' => 'question', 'attrs' => ['uuid' => '0192f3a4-5b6c-7d8e-9f01-23456789abcd']]]];

    expect(FormatQuestion::erreur(TypeQuestion::VraiFaux, $avecQuestion, [], ['valeur' => true]))->toBe('Un énoncé ne contient pas d\'autre question.')
        ->and(FormatQuestion::erreurAides([$enonce, $enonce, $enonce, $enonce], []))->toBe('Trois indices au plus.')
        ->and(FormatQuestion::erreurAides([['type' => 'doc', 'content' => []]], []))->toBe('Un indice est vide ou mal formé.')
        ->and(FormatQuestion::erreurAides([], [['titre' => 'x', 'blocs' => $enonce, 'autre' => 1]]))->toContain('mal formée')
        ->and(FormatQuestion::erreurAides([$enonce], [['titre' => '', 'blocs' => $enonce]]))->toBeNull();
});
