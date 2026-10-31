<?php

use App\Enums\TypeQuestion;
use App\Models\Tentative;

/*
 * Question ouverte (PLAN M5) : l'élève rédige, lit le corrigé, coche les
 * critères du barème qu'il remplit (`tentative.auto_evaluer`, HORS_LIGNE.md
 * A.6). Les deux gestes partent ensemble par la file, le second dépendant
 * du premier.
 */

beforeEach(function () {
    $this->eleve = eleveAvecProfil('BEPC');
    $this->jeton = appareilDe($this->eleve);
    $this->question = questionPubliee(notionDeTest(), TypeQuestion::Ouverte, ['bareme' => [
        ['id' => 'c1', 'critere' => 'Je cite le théorème.', 'points' => 1],
        ['id' => 'c2', 'critere' => 'Je fais le calcul juste.', 'points' => 3],
    ]], []);
});

function rediger(object $test, string $texte = 'BC² = AB² + AC², donc BC = 5.'): array
{
    return geste($test->eleve, 'tentative.enregistrer', ['question' => $test->question->uuid, 'version' => 1, 'reponse' => ['texte' => $texte]]);
}

test('la rédaction n\'a pas de score avant l\'auto-évaluation ; ensuite, la part des points cochés', function () {
    $redaction = rediger($this);
    $evaluation = [...geste($this->eleve, 'tentative.auto_evaluer', ['tentative' => $redaction['uuid'], 'criteres' => ['c2']]), 'depend_de' => $redaction['uuid']];

    // L'auto-évaluation arrive dans le même lot, après la rédaction (depend_de).
    envoyer($this->jeton, [$redaction, $evaluation])
        ->assertJsonPath('resultats.0.resultat.score', null)
        ->assertJsonPath('resultats.0.resultat.correcte', null)
        ->assertJsonPath('resultats.1.verdict', 'acceptee')
        ->assertJsonPath('resultats.1.resultat.score', 75);

    $tentative = Tentative::sole();
    expect($tentative->score)->toBe(75)
        ->and($tentative->correcte)->toBeFalse()
        ->and($tentative->criteres)->toBe(['c2'])
        ->and($tentative->auto_evaluee_le)->not->toBeNull()
        ->and($tentative->reponse['texte'])->toStartWith('BC²');
});

test('une seconde auto-évaluation ne change rien ; les critères inconnus sont ignorés', function () {
    $redaction = rediger($this);
    envoyer($this->jeton, [$redaction]);

    envoyer($this->jeton, [geste($this->eleve, 'tentative.auto_evaluer', ['tentative' => $redaction['uuid'], 'criteres' => ['c1', 'c2', 'c9']])])
        ->assertJsonPath('resultats.0.resultat.score', 100);
    envoyer($this->jeton, [geste($this->eleve, 'tentative.auto_evaluer', ['tentative' => $redaction['uuid'], 'criteres' => []])])
        ->assertJsonPath('resultats.0.verdict', 'acceptee')
        ->assertJsonPath('resultats.0.resultat.score', 100);

    expect(Tentative::sole()->criteres)->toBe(['c1', 'c2'])
        ->and(Tentative::sole()->correcte)->toBeTrue();
});

test('on n\'auto-évalue ni la réponse d\'un autre, ni une question qui se corrige seule', function () {
    $redaction = rediger($this);
    envoyer($this->jeton, [$redaction]);

    $autre = eleveAvecProfil('BEPC');
    $jetonAutre = appareilDe($autre);
    envoyer($jetonAutre, [geste($autre, 'tentative.auto_evaluer', ['tentative' => $redaction['uuid'], 'criteres' => ['c1']])])
        ->assertJsonPath('resultats.0.verdict', 'rejetee');

    // De retour sur le téléphone du premier élève.
    $this->actingAs($this->eleve);
    $qcm = questionDeTest(notionDeTest());
    $reponse = geste($this->eleve, 'tentative.enregistrer', ['question' => $qcm->uuid, 'version' => 1, 'reponse' => ['option' => 'a']]);
    envoyer($this->jeton, [$reponse]);
    envoyer($this->jeton, [geste($this->eleve, 'tentative.auto_evaluer', ['tentative' => $reponse['uuid'], 'criteres' => ['c1']])])
        ->assertJsonPath('resultats.0.verdict', 'rejetee')
        ->assertJsonPath('resultats.0.motif', 'Cette question se corrige toute seule.');

    expect(Tentative::where('uuid', $redaction['uuid'])->sole()->score)->toBeNull();
});
