<?php

use App\Support\Telephone;

/**
 * Même jeu d'exemples que tests/js/telephone.test.ts : PHP et JavaScript
 * normalisent un numéro à l'identique.
 *
 * @return array<string, array{string, string|null}>
 */
function exemplesTelephone(): array
{
    $exemples = json_decode((string) file_get_contents(__DIR__.'/../fixtures/telephones.json'), true);

    return collect($exemples)
        ->mapWithKeys(fn (array $exemple): array => [
            '« '.$exemple['saisie'].' »' => [$exemple['saisie'], $exemple['normalise']],
        ])
        ->all();
}

test('un numéro saisi est normalisé au format +224', function (string $saisie, ?string $attendu) {
    expect(Telephone::normaliser($saisie))->toBe($attendu);
})->with(exemplesTelephone());

test('un numéro masqué ne montre que le début et la fin', function () {
    expect(Telephone::masquer('+224622123456'))->toBe('6•• •• •4 56');
});
