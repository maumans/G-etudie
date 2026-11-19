<?php

use App\Support\FiltreFil;

/*
 * Lot 12 : le filtre à l'envoi du fil d'un groupe (mineurs, CLAUDE.md § 9).
 */

test('ce qui passe : une vraie question de cours, une date, un calcul, un mot qui en contient un interdit', function (string $texte) {
    expect(FiltreFil::refus($texte, ['con', 'idiot']))->toBeNull();
})->with([
    'Comment on trouve l’hypoténuse dans un triangle rectangle ?',
    'Le devoir est pour le 18.11.2026, c’est bien ça ?',
    '3² + 4² = 25 donc BC = 5 cm',
    'Je ne comprends pas la conjugaison du passé simple.',
    'La population de la Guinée dépasse 13 millions.',
]);

test('ce qui est refusé, avec sa raison', function (string $texte, string $debut) {
    expect(FiltreFil::refus($texte, ['idiot', 'ta gueule']))->toStartWith($debut);
})->with([
    'numéro guinéen' => ['Appelle-moi : 622 12 34 56', 'Pas de numéro'],
    'numéro international' => ['+224 620 00 00 00', 'Pas de numéro'],
    'numéro collé' => ['mon num 622123456', 'Pas de numéro'],
    'e-mail' => ['Écris-moi : fanta.d@exemple.gn', 'Pas d’adresse e-mail'],
    'lien http' => ['https://exemple.org/page', 'Pas de lien'],
    'lien www' => ['va sur www.site-quelconque.net', 'Pas de lien'],
    'site nu' => ['regarde monsite.gn', 'Pas de lien'],
    'mot interdit' => ['Tu es idiot', 'Ce message contient un mot'],
    'majuscules et accents' => ['IDÏOT !', 'Ce message contient un mot'],
    'lettres répétées' => ['idiooooot', 'Ce message contient un mot'],
    'lettres séparées' => ['i.d.i.o.t', 'Ce message contient un mot'],
    'expression' => ['Ta gueule toi', 'Ce message contient un mot'],
]);

test('normaliser : minuscules, sans accents, répétitions et séparateurs réduits', function () {
    expect(FiltreFil::normaliser('ÉLÈVE nuuuul i-d-i-o-t'))->toBe('eleve nul idiot');
});
