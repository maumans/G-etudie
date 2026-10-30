<?php

use App\Models\OperationSynchronisee;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Doubles\OperationDeTest;

beforeEach(fn () => brancherOperationDeTest());

test('le même geste envoyé deux fois est exécuté une fois', function () {
    $eleve = User::factory()->create();
    $jeton = appareilDe($eleve);
    $geste = operation($eleve);

    envoyer($jeton, [$geste])->assertOk()->assertJsonPath('resultats.0.verdict', 'acceptee');
    envoyer($jeton, [$geste])->assertOk()
        ->assertJsonPath('resultats.0.verdict', 'deja_recue')
        ->assertJsonPath('resultats.0.origine', 'acceptee')
        ->assertJsonPath('resultats.0.resultat.note', 12);

    expect(OperationDeTest::$executions)->toHaveCount(1)
        ->and(OperationSynchronisee::count())->toBe(1);
});

test('deux fois le même geste dans un même lot : exécuté une fois', function () {
    $eleve = User::factory()->create();
    $jeton = appareilDe($eleve);
    $geste = operation($eleve);

    envoyer($jeton, [$geste, $geste])
        ->assertJsonPath('resultats.0.verdict', 'acceptee')
        ->assertJsonPath('resultats.1.verdict', 'deja_recue');

    expect(OperationDeTest::$executions)->toHaveCount(1);
});

test('envoi concurrent : la ligne déjà validée par une autre connexion l\'emporte', function () {
    $eleve = User::factory()->create();
    $jeton = appareilDe($eleve);
    $geste = operation($eleve);

    // Une seconde connexion MySQL, hors de la transaction du test, joue
    // l'envoi concurrent qui a gagné (validé avant notre insertion).
    config(['database.connections.concurrente' => config('database.connections.'.config('database.default'))]);
    DB::connection('concurrente')->table('operations_synchronisees')->insert([
        'uuid' => $geste['uuid'],
        'type' => OperationDeTest::TYPE,
        'auteur_id' => null,
        'appareil_id' => null,
        'saisi_le' => now(),
        'recu_le' => now(),
        'horloge_suspecte' => false,
        'verdict' => 'acceptee',
        'resultat' => json_encode(['note' => 12]),
    ]);

    // Nettoyage après le retour en arrière de la transaction du test : avant,
    // le verrou partagé qu'elle a posé sur la ligne bloquerait la suppression.
    $this->beforeApplicationDestroyed(function () use ($geste) {
        DB::connection('concurrente')->table('operations_synchronisees')->where('uuid', $geste['uuid'])->delete();
        DB::purge('concurrente');
    });

    envoyer($jeton, [$geste])
        ->assertJsonPath('resultats.0.verdict', 'deja_recue')
        ->assertJsonPath('resultats.0.resultat.note', 12);

    expect(OperationDeTest::$executions)->toBe([]);
});

test('un identifiant déjà utilisé par un autre compte ne révèle rien', function () {
    $aissatou = User::factory()->create();
    $mamadou = User::factory()->create();
    $uuid = (string) Str::uuid7();

    envoyer(appareilDe($aissatou), [operation($aissatou, ['uuid' => $uuid])])
        ->assertJsonPath('resultats.0.verdict', 'acceptee');

    envoyer(appareilDe($mamadou), [operation($mamadou, ['uuid' => $uuid])])
        ->assertJsonPath('resultats.0.verdict', 'rejetee')
        ->assertJsonMissingPath('resultats.0.resultat');

    expect(OperationDeTest::$executions)->toHaveCount(1);
});
