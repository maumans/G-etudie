<?php

use App\Support\Gnf;

/**
 * Même jeu d'exemples que tests/js/gnf.test.ts : PHP et JavaScript doivent
 * écrire un montant à l'identique.
 *
 * @return array<string, array{int|float, string}>
 */
function exemplesGnf(): array
{
    $exemples = json_decode((string) file_get_contents(__DIR__.'/../fixtures/gnf.json'), true);

    return collect($exemples)
        ->mapWithKeys(fn (array $exemple): array => [
            (string) $exemple['montant'] => [$exemple['montant'], $exemple['attendu']],
        ])
        ->all();
}

test('un montant est écrit au format 100 000 GNF', function (int|float $montant, string $attendu) {
    expect(Gnf::formater($montant))->toBe($attendu);
})->with(exemplesGnf());

test('les milliers sont séparés par une espace insécable, jamais une espace ordinaire', function () {
    expect(Gnf::formater(100000))
        ->not->toContain(' ')
        ->toContain("\u{00A0}");
});
