<?php

use App\Support\NoteExamen;

/*
 * La note d'un examen blanc : même jeu d'exemples que l'appareil
 * (tests/fixtures/notes-examen.json, lib/examen-blanc/note.ts).
 */

$exemples = json_decode((string) file_get_contents(__DIR__.'/../fixtures/notes-examen.json'), true)['notes'];

test('la note sur 20 : même règle que l\'appareil', function (array $parties, float|int $note, array $points) {
    $resultat = NoteExamen::calculer($parties);

    expect($resultat['note'])->toEqual($note)
        ->and(array_column($resultat['parties'], 'points'))->toEqual($points);
})->with(array_combine(
    array_column($exemples, 'nom'),
    array_map(fn (array $e) => [$e['parties'], $e['note'], $e['points']], $exemples),
));
