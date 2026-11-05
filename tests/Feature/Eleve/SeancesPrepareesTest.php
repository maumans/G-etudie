<?php

use App\Enums\Role;
use App\Models\Question;
use App\Models\Seance;
use App\Models\User;
use App\Services\SeanceService;
use App\Services\TentativeService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/*
 * Lot 6, HL4 (HORS_LIGNE.md A.10) : la séance du jour choisie par la
 * maîtrise, et les trois séances préparées d'avance que l'appareil fait hors
 * ligne. Une seule autorité : « Commencer » en ligne ouvre la même séance
 * que celle que l'appareil a gardée.
 */

beforeEach(function () {
    $this->eleve = eleveAvecProfil('BEPC', objectif: 10); // 5 questions par séance
});

afterEach(fn () => Carbon::setTestNow());

function repondreA(User $eleve, $question, bool $juste, CarbonImmutable $quand, ?Seance $seance = null): void
{
    app(TentativeService::class)->enregistrer($eleve, (string) Str::uuid7(), $question, 1, ['option' => $juste ? 'b' : 'a'], $seance, 30, $quand, $quand);
}

test('trois séances préparées, sans jour, différentes et stables d\'un appel à l\'autre', function () {
    foreach (['Une', 'Deux', 'Trois'] as $titre) {
        $notion = notionDeTest($titre);
        foreach (range(1, 5) as $_) {
            questionDeTest($notion);
        }
    }

    $seances = app(SeanceService::class)->aVenir($this->eleve);

    expect($seances)->toHaveCount(3)
        ->and($seances->pluck('jour')->filter()->all())->toBe([])
        ->and($seances->pluck('rang')->all())->toBe([1, 2, 3])
        ->and($seances->every(fn (Seance $s) => count($s->questions) === 5))->toBeTrue()
        // 15 questions, 3 séances de 5 : aucune question deux fois.
        ->and(collect($seances->pluck('questions')->flatten())->unique()->count())->toBe(15)
        ->and(app(SeanceService::class)->aVenir($this->eleve)->pluck('uuid')->all())->toBe($seances->pluck('uuid')->all());
});

test('deux questions d\'une même notion au plus, tant qu\'il y en a d\'autres', function () {
    foreach (['Une', 'Deux', 'Trois'] as $titre) {
        $notion = notionDeTest($titre);
        foreach (range(1, 4) as $_) {
            questionDeTest($notion);
        }
    }

    $seance = app(SeanceService::class)->aVenir($this->eleve)->first();
    $parNotion = Question::query()->whereKey($seance->questions)->get()->countBy('notion_id');

    expect(count($seance->questions))->toBe(5)
        ->and($parNotion->max())->toBe(2);
});

test('la révision due passe en premier, puis ce qui n\'est pas maîtrisé, puis le nouveau', function () {
    Carbon::setTestNow('2026-11-05 18:00');
    $due = notionDeTest('Due');
    $qDue = questionDeTest($due);
    $fragile = notionDeTest('Fragile');
    $qFragile = questionDeTest($fragile);
    $nouvelle = notionDeTest('Nouvelle');
    $qNouvelle = questionDeTest($nouvelle);

    // Réussie il y a 3 jours : due depuis avant-hier. Ratée hier : due demain.
    repondreA($this->eleve, $qDue, true, CarbonImmutable::parse('2026-11-02 20:00'));
    repondreA($this->eleve, $qFragile, false, CarbonImmutable::parse('2026-11-05 08:00'));

    $seance = app(SeanceService::class)->aVenir($this->eleve)->first();

    expect(array_slice($seance->questions, 0, 3))->toBe([$qDue->id, $qFragile->id, $qNouvelle->id]);
});

test('« Commencer » en ligne ouvre la première séance préparée, celle que l\'appareil a gardée', function () {
    questionDeTest(notionDeTest());
    $instantane = $this->actingAs($this->eleve)->getJson(route('eleve.instantane'))->assertOk()
        ->assertHeader('Cache-Control', 'no-store, private')
        ->json();

    $this->actingAs($this->eleve)->post(route('eleve.seance.commencer'))
        ->assertRedirect(route('eleve.seances.show', $instantane['seances'][0]['uuid']));

    $seance = Seance::query()->where('uuid', $instantane['seances'][0]['uuid'])->sole();
    expect($seance->jour->toDateString())->toBe(CarbonImmutable::today()->toDateString());

    // Les props gardées par l'appareil sont celles de l'écran (A.4).
    $this->actingAs($this->eleve)->get(route('eleve.seances.show', $seance))
        ->assertInertia(fn ($page) => $page
            ->component('eleve/seance')
            ->where('seance', $instantane['seances'][0]['props']['seance'])
            ->where('questions.0.uuid', $instantane['seances'][0]['props']['questions'][0]['uuid']));
});

test('une réponse comptée remplace les séances préparées ; l\'ancienne reste valable pour l\'appareil hors ligne', function () {
    Carbon::setTestNow('2026-11-05 18:00');
    $notion = notionDeTest();
    foreach (range(1, 6) as $_) {
        questionDeTest($notion);
    }
    $jeton = appareilDe($this->eleve);
    $gardees = app(SeanceService::class)->aVenir($this->eleve);
    $ancienne = $gardees->first();

    Carbon::setTestNow('2026-11-05 18:10');
    // Hors ligne, l'élève fait la première séance gardée ; la réponse arrive.
    $question = Question::find($ancienne->questions[0]);
    envoyer($jeton, [geste($this->eleve, 'tentative.enregistrer', [
        'question' => $question->uuid, 'version' => 1, 'reponse' => ['option' => 'b'], 'seance' => $ancienne->uuid,
    ], '2026-11-05T18:05:00.000Z')])->assertOk()->assertJsonPath('resultats.0.verdict', 'acceptee');

    // Commencée par la réponse : elle a pris le jour du geste.
    expect($ancienne->fresh()->jour->toDateString())->toBe('2026-11-05');

    Carbon::setTestNow('2026-11-05 18:11');
    $fraiches = app(SeanceService::class)->aVenir($this->eleve);
    expect($fraiches->pluck('uuid')->intersect($gardees->pluck('uuid'))->all())->toBe([])
        ->and(Seance::query()->whereKey($gardees->skip(1)->modelKeys())->whereNotNull('remplacee_le')->count())->toBe($gardees->count() - 1);

    // Une séance remplacée accepte encore les réponses d'un appareil resté hors ligne.
    $remplacee = $gardees->get(1);
    $question = Question::find($remplacee->questions[0]);
    envoyer($jeton, [geste($this->eleve, 'tentative.enregistrer', [
        'question' => $question->uuid, 'version' => 1, 'reponse' => ['option' => 'b'], 'seance' => $remplacee->uuid,
    ])])->assertOk()->assertJsonPath('resultats.0.verdict', 'acceptee');
    envoyer($jeton, [geste($this->eleve, 'seance.terminer', ['seance' => $remplacee->uuid])])
        ->assertOk()->assertJsonPath('resultats.0.verdict', 'acceptee');
});

test('l\'objectif du soir changé : les séances préparées sont refaites à la bonne longueur', function () {
    $notion = notionDeTest();
    foreach (range(1, 9) as $_) {
        questionDeTest($notion);
    }
    app(SeanceService::class)->aVenir($this->eleve);
    $this->eleve->profilEleve->update(['objectif_minutes' => 15]);

    $seance = app(SeanceService::class)->aVenir($this->eleve->fresh())->first();

    expect($seance->duree_minutes)->toBe(15)
        ->and(count($seance->questions))->toBe(8);
});

test('sans question publiée, ni séance préparée ni « Commencer »', function () {
    expect(app(SeanceService::class)->aVenir($this->eleve))->toHaveCount(0);

    $this->actingAs($this->eleve)->post(route('eleve.seance.commencer'))->assertRedirect(route('eleve.accueil'));
});

test('l\'instantané : réservé à l\'élève, et à un élève qui a un profil', function () {
    $this->get(route('eleve.instantane'))->assertRedirect(route('login'));

    $redacteur = User::factory()->avecRole(Role::Redacteur)->create();
    $this->actingAs($redacteur)->getJson(route('eleve.instantane'))->assertForbidden();

    $sansProfil = User::factory()->sansProfil()->create();
    $this->actingAs($sansProfil)->getJson(route('eleve.instantane'))->assertRedirect(route('eleve.bienvenue'));
});
