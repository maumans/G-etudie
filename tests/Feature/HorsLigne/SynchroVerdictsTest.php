<?php

use App\Enums\Role;
use App\Models\OperationSynchronisee;
use App\Models\User;
use Illuminate\Support\Str;
use Tests\Doubles\OperationDeTest;

beforeEach(fn () => brancherOperationDeTest());

test('un refus métier est mémorisé avec sa charge et sa phrase', function () {
    $eleve = User::factory()->create();
    $geste = operation($eleve, ['charge' => ['valeur' => -3]]);

    envoyer(appareilDe($eleve), [$geste])
        ->assertJsonPath('resultats.0.verdict', 'rejetee')
        ->assertJsonPath('resultats.0.motif', 'Une note ne peut pas être négative.');

    $ligne = OperationSynchronisee::sole();
    expect($ligne->verdict)->toBe('rejetee')
        ->and($ligne->charge)->toBe(['valeur' => -3])
        ->and($ligne->motif)->toBe('Une note ne peut pas être négative.')
        ->and($ligne->auteur_id)->toBe($eleve->id);
});

test('une panne n\'est jamais mémorisée : le même geste passe au renvoi', function () {
    $eleve = User::factory()->create();
    $jeton = appareilDe($eleve);
    $geste = operation($eleve, ['charge' => ['valeur' => 999]]);

    envoyer($jeton, [$geste])->assertJsonPath('resultats.0.verdict', 'erreur');
    expect(OperationSynchronisee::count())->toBe(0);

    $geste['charge'] = ['valeur' => 15];
    envoyer($jeton, [$geste])->assertJsonPath('resultats.0.verdict', 'acceptee');
});

test('une dépendance pas encore arrivée reporte le geste, sans le mémoriser', function () {
    $eleve = User::factory()->create();
    $jeton = appareilDe($eleve);
    $premier = operation($eleve);
    $second = operation($eleve, ['depend_de' => $premier['uuid']]);

    envoyer($jeton, [$second])->assertJsonPath('resultats.0.verdict', 'reporte');
    expect(OperationSynchronisee::count())->toBe(0);

    envoyer($jeton, [$premier, $second])
        ->assertJsonPath('resultats.0.verdict', 'acceptee')
        ->assertJsonPath('resultats.1.verdict', 'acceptee');
});

test('un geste qui dépend d\'un geste refusé est refusé', function () {
    $eleve = User::factory()->create();
    $jeton = appareilDe($eleve);
    $refuse = operation($eleve, ['charge' => ['valeur' => -1]]);

    envoyer($jeton, [$refuse, operation($eleve, ['depend_de' => $refuse['uuid']])])
        ->assertJsonPath('resultats.1.verdict', 'rejetee');
});

test('type inconnu, charge invalide, permission manquante : refus définitifs', function () {
    $eleve = User::factory()->create();
    $jeton = appareilDe($eleve);

    envoyer($jeton, [
        operation($eleve, ['type' => 'inconnu.geste']),
        operation($eleve, ['charge' => ['valeur' => 'douze']]),
    ])
        ->assertJsonPath('resultats.0.verdict', 'rejetee')
        ->assertJsonPath('resultats.1.verdict', 'rejetee');

    $redacteur = User::factory()->avecRole(Role::Redacteur)->create();
    envoyer(appareilDe($redacteur), [operation($redacteur)])
        ->assertJsonPath('resultats.0.verdict', 'rejetee')
        ->assertJsonPath('resultats.0.motif', 'Ce compte ne peut pas faire ce geste.');

    expect(OperationDeTest::$executions)->toBe([])
        ->and(OperationSynchronisee::where('verdict', 'rejetee')->count())->toBe(3);
});

test('un UUID v4 est refusé, un v7 accepté', function () {
    $eleve = User::factory()->create();

    envoyer(appareilDe($eleve), [
        operation($eleve, ['uuid' => (string) Str::uuid()]),
        operation($eleve, ['uuid' => 'pas-un-uuid']),
        operation($eleve),
    ])
        ->assertJsonPath('resultats.0.verdict', 'rejetee')
        ->assertJsonPath('resultats.1.verdict', 'rejetee')
        ->assertJsonPath('resultats.2.verdict', 'acceptee');

    expect(OperationSynchronisee::count())->toBe(1);
});

test('un appareil inconnu reçoit 409, sans rien exécuter', function () {
    $eleve = User::factory()->create();
    appareilDe($eleve);

    envoyer('jeton-inconnu', [operation($eleve)])->assertStatus(409);
    expect(OperationDeTest::$executions)->toBe([]);
});

test('un lot de plus de 50 opérations est refusé', function () {
    $eleve = User::factory()->create();

    envoyer(appareilDe($eleve), array_map(fn () => operation($eleve), range(1, 51)))
        ->assertUnprocessable();
});
