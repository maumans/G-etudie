<?php

use App\Models\OperationSynchronisee;
use App\Models\User;
use Tests\Doubles\OperationDeTest;

beforeEach(fn () => brancherOperationDeTest());

test('deux profils sur un téléphone : chaque geste est attribué au bon élève', function () {
    $aine = User::factory()->create();
    $cadet = User::factory()->create();
    $jeton = appareilDe($aine);
    appareilDe($cadet, $jeton);

    // L'aîné est connecté ; la file contient aussi un geste du cadet.
    $gesteAine = operation($aine);
    $gesteCadet = operation($cadet, ['charge' => ['valeur' => 7]]);

    $this->actingAs($aine);
    envoyer($jeton, [$gesteAine, $gesteCadet])
        ->assertJsonPath('resultats.0.verdict', 'acceptee')
        ->assertJsonPath('resultats.0.resultat.auteur', $aine->id)
        ->assertJsonPath('resultats.1.verdict', 'reporte');

    // Le cadet se connecte sur le même téléphone : son geste part, à son nom.
    $this->actingAs($cadet);
    envoyer($jeton, [$gesteCadet])
        ->assertJsonPath('resultats.0.verdict', 'acceptee')
        ->assertJsonPath('resultats.0.resultat.auteur', $cadet->id);

    expect(OperationSynchronisee::pluck('auteur_id', 'uuid')->all())->toBe([
        $gesteAine['uuid'] => $aine->id,
        $gesteCadet['uuid'] => $cadet->id,
    ]);
});

test('le geste d\'un profil non rattaché à l\'appareil est reporté, jamais attribué', function () {
    $eleve = User::factory()->create();
    $etranger = User::factory()->create();
    $jeton = appareilDe($eleve);

    // Même connecté, l'étranger n'est pas rattaché à ce jeton.
    $this->actingAs($etranger);
    envoyer($jeton, [operation($etranger)])->assertJsonPath('resultats.0.verdict', 'reporte');

    expect(OperationDeTest::$executions)->toBe([])
        ->and(OperationSynchronisee::count())->toBe(0);
});

test('un compte désactivé : le geste d\'avant est accepté, celui d\'après refusé', function () {
    $eleve = User::factory()->create();
    $jeton = appareilDe($eleve);
    $eleve->forceFill(['desactive_le' => now()->subHour()])->save();

    envoyer($jeton, [
        operation($eleve, ['saisi_le' => now()->subHours(2)->toIso8601ZuluString()]),
        operation($eleve, ['saisi_le' => now()->subMinutes(5)->toIso8601ZuluString()]),
    ])
        ->assertJsonPath('resultats.0.verdict', 'acceptee')
        ->assertJsonPath('resultats.1.verdict', 'rejetee');
});

test('après le geste, l\'utilisateur courant redevient celui de la session', function () {
    $eleve = User::factory()->create();

    envoyer(appareilDe($eleve), [operation($eleve)]);

    expect(auth()->id())->toBe($eleve->id);
});
