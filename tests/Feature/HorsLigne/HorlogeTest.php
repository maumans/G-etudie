<?php

use App\Models\OperationSynchronisee;
use App\Models\User;
use App\Services\HorsLigne\Horloge;
use Carbon\CarbonImmutable;
use Tests\Doubles\OperationDeTest;

function midi(): CarbonImmutable
{
    return CarbonImmutable::parse('2026-10-30 12:00:00');
}

test('horloge à l\'heure : pas suspecte, même pour une réponse de la veille', function () {
    $horloge = new Horloge(-4200, midi()->subMinutes(2), midi());

    expect($horloge->estSuspecte(midi()->subDay(), midi()))->toBeFalse()
        ->and($horloge->corriger(midi())->getTimestampMs())->toBe(midi()->subMilliseconds(4200)->getTimestampMs());
});

test('les quatre cas d\'horloge suspecte', function (Horloge $horloge, CarbonImmutable $saisiLe) {
    expect($horloge->estSuspecte($saisiLe, midi()))->toBeTrue();
})->with([
    'décalage jamais mesuré' => fn () => [new Horloge(null, null, null), midi()->subMinute()],
    'décalage de plus de 10 min' => fn () => [new Horloge(11 * 60 * 1000, midi(), midi()), midi()->subHour()],
    'geste dans le futur' => fn () => [new Horloge(0, midi(), midi()), midi()->addMinutes(5)],
    'horloge reculée depuis la mesure' => fn () => [new Horloge(0, midi(), midi()->subHours(3)), midi()->subHours(4)],
]);

test('le serveur range l\'heure corrigée du geste et signale une horloge suspecte', function () {
    brancherOperationDeTest();
    $eleve = User::factory()->create();
    $jeton = appareilDe($eleve);
    $saisiAppareil = now()->subMinutes(30);

    envoyer($jeton, [operation($eleve, ['saisi_le' => $saisiAppareil->toIso8601ZuluString('millisecond')])], [
        'decalage_horloge_ms' => 120_000,
    ])->assertJsonPath('resultats.0.verdict', 'acceptee');

    $ligne = OperationSynchronisee::sole();
    expect($ligne->saisi_le->getTimestamp())->toBe($saisiAppareil->addMinutes(2)->getTimestamp())
        ->and($ligne->horloge_suspecte)->toBeFalse();

    envoyer($jeton, [operation($eleve)], ['decalage_horloge_ms' => null]);

    expect(OperationSynchronisee::latest('id')->first()->horloge_suspecte)->toBeTrue()
        ->and(OperationDeTest::$executions[1]['horloge_suspecte'])->toBeTrue();
});
