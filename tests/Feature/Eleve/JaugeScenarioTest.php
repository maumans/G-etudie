<?php

use App\Models\Maitrise;
use App\Models\Notion;
use App\Models\Question;
use App\Models\User;
use App\Services\MaitriseService;
use App\Support\CatalogueEleve;
use Carbon\CarbonImmutable;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/*
 * Critère d'acceptation du lot 6 (PLAN § 12) : « la jauge d'un élève de test
 * évolue comme attendu sur un scénario écrit ». Le scénario, et le détail de
 * chaque valeur, est dans tests/fixtures/scenario-jauge.json. Les réponses
 * passent par la vraie porte d'entrée (la file, /sync/operations) ; la jauge
 * est relue par la route de l'appareil (/eleve/instantane).
 */

/**
 * @return array{eleve: User, jeton: string, questions: array<string, list<Question>>, notions: array<string, Notion>, scenario: array<string, mixed>}
 */
function decorDuScenario(): array
{
    $scenario = json_decode((string) file_get_contents(base_path('tests/fixtures/scenario-jauge.json')), true, flags: JSON_THROW_ON_ERROR);
    Carbon::setTestNow('2026-11-01 09:00');
    $eleve = eleveAvecProfil($scenario['examen']);
    $notions = [];
    $questions = [];

    foreach ($scenario['notions'] as $cle => $notion) {
        $notions[$cle] = $notion['matiere'] === 'maths'
            ? notionDeTest($notion['titre'])
            : notionAilleurs($notion['matiere'], '10e année', $notion['titre']);
        $questions[$cle] = [questionDeTest($notions[$cle]), questionDeTest($notions[$cle]), questionDeTest($notions[$cle])];
    }

    return ['eleve' => $eleve, 'jeton' => appareilDe($eleve), 'questions' => $questions, 'notions' => $notions, 'scenario' => $scenario];
}

/**
 * Les gestes d'une étape, à 20:00 le jour dit, chaque notion prenant ses
 * questions tour à tour.
 *
 * @param  array<string, int>  $rangs
 * @return list<array<string, mixed>>
 */
function gestesDeLEtape(array $decor, array $etape, array &$rangs): array
{
    $saisiLe = CarbonImmutable::parse($etape['jour'].' 20:00')->toIso8601ZuluString('millisecond');

    return array_map(function (array $reponse) use ($decor, $saisiLe, &$rangs) {
        [$notion, $juste] = $reponse;
        $rang = $rangs[$notion] = (($rangs[$notion] ?? -1) + 1) % 3;

        return geste($decor['eleve'], 'tentative.enregistrer', [
            'question' => $decor['questions'][$notion][$rang]->uuid,
            'version' => 1,
            'reponse' => ['option' => $juste ? 'b' : 'a'],
        ], $saisiLe);
    }, $etape['reponses']);
}

function verifierEtape(object $test, array $decor, array $etape): void
{
    foreach ($etape['attendu']['notions'] as $cle => $attendu) {
        $maitrise = Maitrise::query()->where('user_id', $decor['eleve']->id)->where('notion_id', $decor['notions'][$cle]->id)->sole();

        expect([
            'maitrise' => $maitrise->score,
            'palier' => $maitrise->palier,
            'prochaine_revision_le' => $maitrise->prochaine_revision_le?->toDateString(),
        ])->toBe($attendu, "{$etape['jour']}, notion {$cle}");
    }

    $instantane = $test->actingAs($decor['eleve'])->getJson(route('eleve.instantane'))->assertOk()->json();
    $matieres = collect($instantane['jauge']['matieres'])->pluck('maitrise', 'cle');

    foreach ($etape['attendu']['matieres'] as $cle => $attendue) {
        expect($matieres[$cle])->toBe($attendue, "{$etape['jour']}, matière {$cle}");
    }

    expect($instantane['jauge']['pourcentage'])->toBe($etape['attendu']['jauge'], "{$etape['jour']}, jauge");
}

afterEach(fn () => Carbon::setTestNow());

test('la jauge suit le scénario écrit, étape par étape, réponses reçues par la file', function () {
    $decor = decorDuScenario();
    $rangs = [];
    $profil = CatalogueEleve::profil($decor['eleve']);

    expect(app(MaitriseService::class)->jauge($profil)['pourcentage'])->toBe(0);

    foreach ($decor['scenario']['etapes'] as $etape) {
        Carbon::setTestNow($etape['jour'].' 20:05');

        if (isset($etape['a_revoir_avant'])) {
            $aRevoir = collect(app(MaitriseService::class)->detail($profil, CarbonImmutable::now())['a_revoir'])->pluck('id')->all();
            $attendues = array_map(fn (string $cle) => $decor['notions'][$cle]->id, $etape['a_revoir_avant']);
            expect($aRevoir)->toEqualCanonicalizing($attendues, "{$etape['jour']}, à revoir");
        }

        $resultats = envoyer($decor['jeton'], gestesDeLEtape($decor, $etape, $rangs))->assertOk()->json('resultats');
        expect(collect($resultats)->pluck('verdict')->unique()->all())->toBe(['acceptee']);

        verifierEtape($this, $decor, $etape);
    }
});

test('hors ligne : les mêmes réponses arrivées d\'un coup et dans le désordre donnent la même jauge', function () {
    $decor = decorDuScenario();
    $rangs = [];
    $gestes = [];

    foreach ($decor['scenario']['etapes'] as $etape) {
        $gestes = [...$gestes, ...gestesDeLEtape($decor, $etape, $rangs)];
    }

    $derniere = end($decor['scenario']['etapes']);
    Carbon::setTestNow($derniere['jour'].' 20:05');

    // Le serveur traite le lot dans l'ordre de ses uuid : on les inverse
    // pour que la plus ancienne réponse arrive la dernière.
    $gestes = array_reverse($gestes);
    foreach ($gestes as $rang => &$geste) {
        $geste['uuid'] = (string) Str::uuid7(CarbonImmutable::now()->addMilliseconds($rang));
    }
    unset($geste);

    envoyer($decor['jeton'], $gestes)->assertOk();

    verifierEtape($this, $decor, $derniere);
});
