<?php

use App\Support\BlocsContenu;

/**
 * Même jeu d'exemples que tests/js/contenu/blocs.test.ts : le serveur et
 * l'appareil acceptent et refusent les mêmes documents (HORS_LIGNE.md A.4).
 *
 * @return array<string, array{mixed, bool}>
 */
function exemplesBlocs(): array
{
    $exemples = json_decode((string) file_get_contents(__DIR__.'/../fixtures/blocs.json'), true);

    return collect($exemples)
        ->mapWithKeys(fn (array $exemple): array => [$exemple['nom'] => [$exemple['doc'], $exemple['valide']]])
        ->all();
}

/** Un paragraphe enveloppé dans `n` listes à puces. */
function listesImbriquees(int $n): array
{
    $noeud = ['type' => 'paragraph'];

    for ($i = 0; $i < $n; $i++) {
        $noeud = ['type' => 'bulletList', 'content' => [['type' => 'listItem', 'content' => [['type' => 'paragraph'], $noeud]]]];
    }

    return ['type' => 'doc', 'content' => [$noeud]];
}

test('le format des blocs accepte et refuse comme le navigateur', function (mixed $doc, bool $valide) {
    expect(BlocsContenu::estValide($doc))->toBe($valide, (string) BlocsContenu::erreur($doc));
})->with(exemplesBlocs());

test('une formule de plus de 1 000 caractères est refusée', function () {
    $formule = fn (int $n) => ['type' => 'doc', 'content' => [['type' => 'formuleBloc', 'attrs' => ['latex' => str_repeat('é', $n)]]]];

    expect(BlocsContenu::estValide($formule(1000)))->toBeTrue()
        ->and(BlocsContenu::erreur($formule(1001)))->toContain('trop longue');
});

test('un contenu de plus de 100 Ko ou trop imbriqué est refusé', function () {
    $lourd = ['type' => 'doc', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => str_repeat('a', 100_001)]]]]];

    expect(BlocsContenu::erreur($lourd))->toContain('trop long')
        ->and(BlocsContenu::estValide(listesImbriquees(2)))->toBeTrue()
        ->and(BlocsContenu::erreur(listesImbriquees(4)))->toContain('imbriqué');
});

test('le résumé compte les mots, les formules et les encadrés', function () {
    $exemples = json_decode((string) file_get_contents(__DIR__.'/../fixtures/blocs.json'), true);
    $lecon = collect($exemples)->firstWhere('nom', 'leçon complète')['doc'];

    expect(BlocsContenu::resume($lecon))->toBe(['mots' => 19, 'formules' => 3, 'encadres' => 1]);
});
