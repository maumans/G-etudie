<?php

use App\Models\BadgeObtenu;
use App\Models\Defi;
use App\Models\PointEffort;
use App\Models\Seance;
use App\Services\MotivationService;
use App\Services\SeanceService;
use App\Support\CatalogueEleve;
use Carbon\CarbonImmutable;
use Illuminate\Support\Carbon;

/*
 * Lot 6, PLAN M9 : série avec jour de grâce, points d'effort comptés à la
 * réception et idempotents, badges mérités une fois, défi de la semaine.
 * Les gestes passent par la file, comme sur le téléphone.
 */

beforeEach(function () {
    $this->eleve = eleveAvecProfil('BEPC', objectif: 10);
    $this->jeton = appareilDe($this->eleve);
    $this->question = questionDeTest(notionDeTest());
});

afterEach(fn () => Carbon::setTestNow());

function reponseLe(object $test, string $saisiLe, bool $juste = true, ?string $seance = null): array
{
    return geste($test->eleve, 'tentative.enregistrer', array_filter([
        'question' => $test->question->uuid,
        'version' => 1,
        'reponse' => ['option' => $juste ? 'b' : 'a'],
        'seance' => $seance,
        'duree_secondes' => 40,
    ]), $saisiLe);
}

test('un jour manqué par semaine est pardonné ; deux, la série repart', function () {
    // Jeudi 5 novembre 2026. Lundi 2 et mardi 3 faits, mercredi 4 manqué.
    Carbon::setTestNow('2026-11-05 20:30');
    envoyer($this->jeton, [reponseLe($this, '2026-11-02T20:00:00.000Z'), reponseLe($this, '2026-11-03T20:00:00.000Z')])->assertOk();

    $serie = app(MotivationService::class)->serie($this->eleve->id);
    // Rien encore aujourd'hui : hier (mercredi) est gracié, la série tient.
    expect($serie['jours'])->toBe(2)
        ->and($serie['rompue'])->toBeFalse()
        ->and(collect($serie['cases'])->firstWhere('date', '2026-11-04')['etat'])->toBe('grace')
        ->and(collect($serie['cases'])->firstWhere('date', '2026-11-05')['etat'])->toBe('aujourdhui');

    envoyer($this->jeton, [reponseLe($this, '2026-11-05T20:00:00.000Z')])->assertOk();
    expect(app(MotivationService::class)->serie($this->eleve->id)['jours'])->toBe(3);

    // Samedi 7 : vendredi manqué aussi. Un seul jour pardonné par semaine :
    // le plus récent (vendredi) ; mercredi rompt la série, qui repart de jeudi.
    Carbon::setTestNow('2026-11-07 20:30');
    $serie = app(MotivationService::class)->serie($this->eleve->id);
    expect($serie['jours'])->toBe(1)
        ->and(collect($serie['cases'])->firstWhere('date', '2026-11-06')['etat'])->toBe('grace')
        ->and(collect($serie['cases'])->firstWhere('date', '2026-11-04')['etat'])->toBe('manque');

    // Lundi 9 : samedi et dimanche manqués, la série repart.
    Carbon::setTestNow('2026-11-09 08:00');
    $serie = app(MotivationService::class)->serie($this->eleve->id);
    expect($serie['jours'])->toBe(0)
        ->and($serie['rompue'])->toBeTrue();
});

test('la série compte au jour du geste, même reçu deux jours plus tard', function () {
    Carbon::setTestNow('2026-11-05 09:00');
    envoyer($this->jeton, [
        reponseLe($this, '2026-11-03T21:00:00.000Z'),
        reponseLe($this, '2026-11-04T21:00:00.000Z'),
    ])->assertOk();

    expect(app(MotivationService::class)->serie($this->eleve->id)['jours'])->toBe(2);
});

test('points d\'effort : un par réponse, juste ou non ; un geste rejoué ne compte qu\'une fois', function () {
    $geste = reponseLe($this, now()->toIso8601ZuluString('millisecond'), juste: false);
    envoyer($this->jeton, [$geste])->assertOk();
    envoyer($this->jeton, [$geste])->assertOk()->assertJsonPath('resultats.0.verdict', 'deja_recue');

    // 1 (réponse) + 10 (badge « Premier pas »), relus en base.
    expect(PointEffort::where('user_id', $this->eleve->id)->orderBy('source')->pluck('points', 'source')->all())
        ->toBe(['badge' => 10, 'reponse' => 1])
        ->and(app(MotivationService::class)->points($this->eleve->id))
        ->toBe(['total' => 11, 'niveau' => 1, 'palier' => 0, 'prochain_palier' => 50]);
});

test('une séance terminée : objectif du soir atteint, 20 points, badge mérité une seule fois', function () {
    $seance = app(SeanceService::class)->commencer($this->eleve);
    envoyer($this->jeton, [reponseLe($this, now()->toIso8601ZuluString('millisecond'), seance: $seance->uuid)])->assertOk();
    $fin = geste($this->eleve, 'seance.terminer', ['seance' => $seance->uuid]);
    envoyer($this->jeton, [$fin])->assertOk();
    envoyer($this->jeton, [geste($this->eleve, 'seance.terminer', ['seance' => $seance->uuid])])->assertOk();

    $serie = app(MotivationService::class)->serie($this->eleve->id);
    $aujourdhui = collect($serie['cases'])->firstWhere('date', CarbonImmutable::today()->toDateString());

    expect($aujourdhui['etat'])->toBe('objectif')
        ->and(PointEffort::where('user_id', $this->eleve->id)->where('source', 'seance')->sum('points'))->toEqual(20)
        ->and(BadgeObtenu::where('user_id', $this->eleve->id)->with('badge')->get()->pluck('badge.cle')->sort()->values()->all())
        ->toBe(['premier_exercice', 'premiere_seance'])
        ->and(Seance::find($seance->id)->termine_le)->not->toBeNull();
});

test('le défi de la semaine vise la matière qui rapporte le plus ; réussi, il rapporte 30 points et un badge', function () {
    Carbon::setTestNow('2026-11-04 18:00'); // mercredi
    $profil = CatalogueEleve::profil($this->eleve);
    $defi = app(MotivationService::class)->defi($profil);

    // Seules les maths ont des questions : c'est la seule matière possible.
    // Objectif : 2 × 5 questions (objectif du soir de 10 min).
    expect($defi)->toMatchArray(['cle' => 'maths', 'objectif' => 10, 'fait' => 0, 'reussi' => false, 'fin' => '2026-11-08'])
        ->and(Defi::count())->toBe(1);

    $gestes = [];
    foreach (range(0, 9) as $minute) {
        $gestes[] = reponseLe($this, CarbonImmutable::parse('2026-11-04 17:00')->addMinutes($minute)->toIso8601ZuluString('millisecond'));
    }
    // Une réponse de la semaine dernière ne compte pas.
    $gestes[] = reponseLe($this, '2026-11-01T20:00:00.000Z');
    envoyer($this->jeton, array_slice($gestes, 0, 9))->assertOk();

    expect(app(MotivationService::class)->defi($profil)['fait'])->toBe(9);

    envoyer($this->jeton, array_slice($gestes, 9))->assertOk();
    $defi = app(MotivationService::class)->defi($profil);

    expect($defi['fait'])->toBe(10)
        ->and($defi['reussi'])->toBeTrue()
        ->and(PointEffort::where('user_id', $this->eleve->id)->where('source', 'defi')->sum('points'))->toEqual(30)
        ->and(BadgeObtenu::where('user_id', $this->eleve->id)->whereHas('badge', fn ($b) => $b->where('cle', 'defi_reussi'))->exists())->toBeTrue();
});

test('les badges : catalogue semé, chacun avec sa date d\'obtention ou à gagner', function () {
    envoyer($this->jeton, [reponseLe($this, now()->toIso8601ZuluString('millisecond'))])->assertOk();
    $badges = collect(app(MotivationService::class)->badges($this->eleve->id));

    expect($badges)->toHaveCount(12)
        ->and($badges->firstWhere('cle', 'premier_exercice')['obtenu_le'])->not->toBeNull()
        ->and($badges->firstWhere('cle', 'serie_7')['obtenu_le'])->toBeNull();
});
