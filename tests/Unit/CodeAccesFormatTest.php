<?php

use App\Support\CodeAcces;

/*
 * Lot 9 : le format des codes prépayés, sur le jeu d'exemples partagé avec
 * resources/js/lib/code-acces.ts (tests/js/code-acces.test.ts).
 */

$exemples = json_decode((string) file_get_contents(__DIR__.'/../fixtures/codes-acces.json'), true);

test('un code bien tapé est reconnu, quelle que soit sa présentation', function (string $saisie, string $normalise) {
    expect(CodeAcces::normaliser($saisie))->toBe($normalise);
})->with(array_map(fn (array $e) => [$e['saisie'], $e['normalise']], $exemples['valides']));

test('un code mal tapé est refusé avant tout envoi', function (string $saisie) {
    expect(CodeAcces::normaliser($saisie))->toBeNull();
})->with(array_map(fn (string $s) => [$s], $exemples['mal_tapes']));

test('un code généré est toujours valide, sans 0, O, 1 ni I', function () {
    for ($i = 0; $i < 200; $i++) {
        $code = CodeAcces::generer();
        expect(CodeAcces::normaliser($code))->toBe($code)
            ->and($code)->not->toMatch('/[01IO]/');
    }
});

test('une seule faute de frappe est vue par la clé de contrôle', function () {
    $code = CodeAcces::generer();

    for ($rang = 0; $rang < 11; $rang++) {
        foreach (str_split(CodeAcces::ALPHABET) as $autre) {
            if ($autre === $code[$rang]) {
                continue;
            }

            $faux = $code;
            $faux[$rang] = $autre;

            expect(CodeAcces::normaliser($faux))->toBeNull();
        }
    }
});
