<?php

use App\Services\MaitriseService;
use Carbon\CarbonImmutable;

/*
 * Le calcul de la maîtrise d'une notion, sans base (MaitriseService::calculer).
 * Le scénario complet est rejoué par JaugeScenarioTest.
 */

function reponsesDe(array $lignes): array
{
    return array_map(fn (array $l) => ['score' => $l[0], 'saisi_le' => CarbonImmutable::parse($l[1])], $lignes);
}

test('une seule réponse juste ne fait pas 100 % : il en faut trois pour la confiance pleine', function () {
    expect(MaitriseService::calculer(reponsesDe([[100, '2026-11-02 20:00']]))['score'])->toBe(33)
        ->and(MaitriseService::calculer(reponsesDe([[100, '2026-11-02 20:00'], [100, '2026-11-02 20:01']]))['score'])->toBe(67)
        ->and(MaitriseService::calculer(reponsesDe([[100, '2026-11-02 20:00'], [100, '2026-11-02 20:01'], [100, '2026-11-02 20:02']]))['score'])->toBe(100);
});

test('une réponse vieille de 14 jours pèse deux fois moins que la plus récente', function () {
    // (0 × 0,5 + 100 × 1 + 100 × 1) / 2,5 = 80
    $calcul = MaitriseService::calculer(reponsesDe([[0, '2026-10-20 20:00'], [100, '2026-11-03 20:00'], [100, '2026-11-03 20:00']]));

    expect($calcul['score'])->toBe(80);
});

test('seules les 20 dernières réponses comptent', function () {
    $lignes = array_fill(0, 10, [0, '2026-11-01 20:00']);
    $lignes = [...$lignes, ...array_fill(0, 20, [100, '2026-11-01 20:00'])];

    expect(MaitriseService::calculer(reponsesDe($lignes)))->toMatchArray(['score' => 100, 'reponses' => 20]);
});

test('révision espacée : 1, 3, 7, 14, 30 jours ; en partie juste, demain sans changer de palier ; fausse, retour au palier 0', function () {
    $palierEtDate = fn (array $lignes) => array_intersect_key(MaitriseService::calculer(reponsesDe($lignes)), array_flip(['palier', 'prochaine_revision_le']));

    $suite = [[100, '2026-11-01 20:00'], [100, '2026-11-02 20:00'], [100, '2026-11-05 20:00'], [100, '2026-11-12 20:00'], [100, '2026-11-26 20:00'], [100, '2026-12-26 20:00']];
    expect($palierEtDate($suite))->toBe(['palier' => 5, 'prochaine_revision_le' => '2027-01-25']);

    // Réussir avant la date ne fait pas monter.
    expect($palierEtDate([[100, '2026-11-01 20:00'], [100, '2026-11-02 20:00'], [100, '2026-11-03 20:00']]))
        ->toBe(['palier' => 2, 'prochaine_revision_le' => '2026-11-05']);

    expect($palierEtDate([[100, '2026-11-01 20:00'], [100, '2026-11-02 20:00'], [60, '2026-11-05 20:00']]))
        ->toBe(['palier' => 2, 'prochaine_revision_le' => '2026-11-06'])
        ->and($palierEtDate([[100, '2026-11-01 20:00'], [100, '2026-11-02 20:00'], [20, '2026-11-05 20:00']]))
        ->toBe(['palier' => 0, 'prochaine_revision_le' => '2026-11-06']);
});
