<?php

use App\Models\Maitrise;
use App\Models\PointEffort;
use App\Models\SerieJour;
use App\Models\Tentative;
use App\Services\TentativeService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Str;

/*
 * Lot 6 : `progression:recalculer` remet maîtrises et séries d'aplomb à
 * partir des réponses reçues (déploiement du lot 6 : les réponses des lots 2
 * à 5 n'en avaient pas). Rejouée, elle ne compte rien deux fois.
 */

test('reconstruit maîtrises et série depuis les réponses, sans doubler les points', function () {
    $eleve = eleveAvecProfil('BEPC');
    $question = questionDeTest(notionDeTest());
    $hier = CarbonImmutable::now()->subDay()->setTime(20, 0);
    app(TentativeService::class)->enregistrer($eleve, (string) Str::uuid7(), $question, 1, ['option' => 'b'], null, 30, $hier, $hier);

    $avant = Maitrise::where('user_id', $eleve->id)->sole()->only(['score', 'palier']);
    $points = PointEffort::where('user_id', $eleve->id)->sum('points');

    // Comme une base d'avant le lot 6.
    Maitrise::query()->delete();
    SerieJour::query()->delete();

    $this->artisan('progression:recalculer')->assertSuccessful();
    $this->artisan('progression:recalculer')->assertSuccessful();

    expect(Maitrise::where('user_id', $eleve->id)->sole()->only(['score', 'palier']))->toBe($avant)
        ->and(SerieJour::where('user_id', $eleve->id)->sole()->only(['jour', 'reponses']))
        ->toEqual(['jour' => $hier->startOfDay(), 'reponses' => 1])
        ->and(PointEffort::where('user_id', $eleve->id)->sum('points'))->toEqual($points);
});

test('une notion dont toutes les réponses ont été effacées perd sa maîtrise', function () {
    $eleve = eleveAvecProfil('BEPC');
    $question = questionDeTest(notionDeTest());
    $maintenant = CarbonImmutable::now();
    app(TentativeService::class)->enregistrer($eleve, (string) Str::uuid7(), $question, 1, ['option' => 'b'], null, 30, $maintenant, $maintenant);

    Tentative::query()->where('user_id', $eleve->id)->delete();
    $this->artisan('progression:recalculer', ['--eleve' => $eleve->id])->assertSuccessful();

    expect(Maitrise::where('user_id', $eleve->id)->exists())->toBeFalse();
});
