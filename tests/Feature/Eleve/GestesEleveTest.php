<?php

use App\Enums\EtatLecon;
use App\Models\ProgressionLecon;
use App\Models\Seance;
use App\Models\Tentative;
use App\Services\HorsLigne\RegistreOperations;
use App\Services\SeanceService;
use Illuminate\Support\Str;

/*
 * Les gestes élève du lot 2 passent par la file d'opérations (HORS_LIGNE.md
 * A.6), en ligne comme hors ligne : réponse (`tentative.enregistrer`), fin
 * de séance (`seance.terminer`), progression dans une leçon
 * (`lecon.progression`).
 */

beforeEach(function () {
    $this->eleve = eleveAvecProfil('BEPC');
    $this->jeton = appareilDe($this->eleve);
});

test('les trois types du lot 2 sont inscrits au registre, chacun avec son libellé', function () {
    $libelles = (string) file_get_contents(resource_path('js/lib/hors-ligne/libelles.ts'));

    expect(array_keys(RegistreOperations::TYPES))
        ->toBe(['tentative.enregistrer', 'seance.terminer', 'lecon.progression']);

    foreach (array_keys(RegistreOperations::TYPES) as $type) {
        expect($libelles)->toContain("'{$type}':");
    }
});

/* ---------- Réponses : le serveur recorrige (A.14 n° 6) ---------- */

test('une réponse est recorrigée par le serveur : ce que l\'appareil affiche ne compte pas', function () {
    $question = questionDeTest(notionDeTest());
    $seance = app(SeanceService::class)->commencer($this->eleve);

    envoyer($this->jeton, [
        // L'appareil ne déclare rien : le serveur corrige lui-même.
        geste($this->eleve, 'tentative.enregistrer', ['question' => $question->uuid, 'version' => 1, 'reponse' => ['option' => 'a'], 'seance' => $seance->uuid, 'duree_secondes' => 31, 'correcte' => true]),
        geste($this->eleve, 'tentative.enregistrer', ['question' => $question->uuid, 'version' => 1, 'reponse' => ['option' => 'b'], 'seance' => null]),
    ])
        ->assertJsonPath('resultats.0.verdict', 'acceptee')
        ->assertJsonPath('resultats.0.resultat.correcte', false)
        ->assertJsonPath('resultats.1.resultat.correcte', true);

    [$fausse, $juste] = Tentative::orderBy('id')->get()->all();
    expect($fausse->correcte)->toBeFalse()
        ->and($fausse->seance_id)->toBe($seance->id)
        ->and($fausse->mode->value)->toBe('seance')
        ->and($fausse->duree_secondes)->toBe(31)
        ->and($fausse->version)->toBe(1)
        ->and($fausse->reponse)->toBe(['option' => 'a'])
        ->and($juste->correcte)->toBeTrue()
        ->and($juste->mode->value)->toBe('entrainement')
        ->and($juste->seance_id)->toBeNull();
});

test('la même réponse envoyée deux fois n\'est comptée qu\'une fois', function () {
    $question = questionDeTest(notionDeTest());
    $geste = geste($this->eleve, 'tentative.enregistrer', ['question' => $question->uuid, 'version' => 1, 'reponse' => ['option' => 'b']]);

    envoyer($this->jeton, [$geste])->assertJsonPath('resultats.0.verdict', 'acceptee');
    envoyer($this->jeton, [$geste])->assertJsonPath('resultats.0.verdict', 'deja_recue');

    expect(Tentative::count())->toBe(1)
        ->and(Tentative::sole()->uuid)->toBe($geste['uuid']);
});

test('une question hors de son examen, inconnue, ou hors de sa séance est refusée', function () {
    $ailleurs = questionDeTest(notionAilleurs('maths', 'Terminale'));
    $sienne = questionDeTest(notionDeTest());
    $autre = eleveAvecProfil('BEPC');
    $seanceDeLAutre = app(SeanceService::class)->commencer($autre);

    envoyer($this->jeton, [
        geste($this->eleve, 'tentative.enregistrer', ['question' => $ailleurs->uuid, 'version' => 1, 'reponse' => ['option' => 'b']]),
        geste($this->eleve, 'tentative.enregistrer', ['question' => (string) Str::uuid7(), 'version' => 1, 'reponse' => ['option' => 'b']]),
        geste($this->eleve, 'tentative.enregistrer', ['question' => $sienne->uuid, 'version' => 1, 'reponse' => ['option' => 'b'], 'seance' => $seanceDeLAutre->uuid]),
        geste($this->eleve, 'tentative.enregistrer', ['question' => $sienne->uuid, 'version' => 1, 'reponse' => []]),
    ])
        ->assertJsonPath('resultats.0.verdict', 'rejetee')
        ->assertJsonPath('resultats.0.motif', 'Cette question n\'est plus proposée.')
        ->assertJsonPath('resultats.1.verdict', 'rejetee')
        ->assertJsonPath('resultats.2.motif', 'Cette question ne fait pas partie de ta séance.')
        ->assertJsonPath('resultats.3.verdict', 'rejetee');

    expect(Tentative::count())->toBe(0);
});

/* ---------- Séance du jour ---------- */

test('la séance du jour prend d\'abord les questions jamais vues, puis les ratées', function () {
    $notion = notionDeTest();
    $questions = collect(range(1, 10))->map(fn () => questionDeTest($notion));
    $service = app(SeanceService::class);

    // 15 minutes = 8 questions.
    $premiere = $service->commencer($this->eleve);
    expect($premiere->questions)->toHaveCount(8)
        ->and($service->commencer($this->eleve)->id)->toBe($premiere->id);

    // Les 8 vues : une ratée, sept réussies ; la séance est terminée.
    foreach ($premiere->questions as $rang => $id) {
        $question = $questions->firstWhere('id', $id);
        envoyer($this->jeton, [geste($this->eleve, 'tentative.enregistrer', [
            'question' => $question->uuid, 'version' => 1, 'reponse' => ['option' => $rang === 0 ? 'a' : 'b'], 'seance' => $premiere->uuid,
        ])]);
    }
    envoyer($this->jeton, [geste($this->eleve, 'seance.terminer', ['seance' => $premiere->uuid])])
        ->assertJsonPath('resultats.0.verdict', 'acceptee');

    $suivante = $service->commencer($this->eleve);
    $jamaisVues = $questions->pluck('id')->diff($premiere->questions)->values()->all();

    expect($suivante->id)->not->toBe($premiere->id)
        ->and(array_slice($suivante->questions, 0, 2))->toEqualCanonicalizing($jamaisVues)
        ->and($suivante->questions[2])->toBe($premiere->questions[0]);
});

test('terminer une séance deux fois ne rejoue rien ; celle d\'un autre est refusée', function () {
    questionDeTest(notionDeTest());
    $seance = app(SeanceService::class)->commencer($this->eleve);
    $autre = eleveAvecProfil('BEPC');
    $seanceDeLAutre = app(SeanceService::class)->commencer($autre);

    envoyer($this->jeton, [geste($this->eleve, 'seance.terminer', ['seance' => $seance->uuid], '2026-10-31T19:00:00.000Z')]);
    $terminee = $seance->fresh()->termine_le;
    envoyer($this->jeton, [geste($this->eleve, 'seance.terminer', ['seance' => $seance->uuid])])
        ->assertJsonPath('resultats.0.verdict', 'acceptee');
    envoyer($this->jeton, [geste($this->eleve, 'seance.terminer', ['seance' => $seanceDeLAutre->uuid])])
        ->assertJsonPath('resultats.0.verdict', 'rejetee');

    expect($seance->fresh()->termine_le->equalTo($terminee))->toBeTrue()
        ->and($seanceDeLAutre->fresh()->termine_le)->toBeNull();
});

test('par l\'écran : « Commencer » ouvre l\'ardoise, qui livre questions et réponses déjà reçues', function () {
    $question = questionDeTest(notionDeTest());

    $this->actingAs($this->eleve)->post(route('eleve.seance.commencer'))
        ->assertRedirect(route('eleve.seances.show', Seance::sole()));

    $seance = Seance::sole();
    envoyer($this->jeton, [geste($this->eleve, 'tentative.enregistrer', ['question' => $question->uuid, 'version' => 1, 'reponse' => ['option' => 'b'], 'seance' => $seance->uuid])]);

    $this->actingAs($this->eleve)->get(route('eleve.seances.show', $seance))
        ->assertInertia(fn ($page) => $page
            ->component('eleve/seance')
            ->where('seance.uuid', $seance->uuid)
            ->where('questions.0.uuid', $question->uuid)
            ->where('questions.0.attendue', ['option' => 'b'])
            ->where('questions.0.matiere', 'maths')
            ->where('reponses.0', ['question' => $question->uuid, 'option' => 'b', 'correcte' => true]));
});

test('sans question publiée, « Commencer » ramène à l\'accueil avec une explication', function () {
    $this->actingAs($this->eleve)->post(route('eleve.seance.commencer'))
        ->assertRedirect(route('eleve.accueil'));

    expect(Seance::count())->toBe(0);
});

/* ---------- Progression : la saisie la plus récente gagne (A.14 n° 10) ---------- */

test('la saisie la plus récente gagne, quel que soit l\'ordre de réception', function () {
    $lecon = leconPubliee(notionDeTest());
    $tot = '2026-10-31T18:00:00.000Z';
    $tard = '2026-10-31T19:00:00.000Z';

    // Le geste le plus récent arrive d'abord (autre appareil, file plus rapide).
    envoyer($this->jeton, [geste($this->eleve, 'lecon.progression', ['lecon' => $lecon->uuid, 'etat' => 'a_revoir', 'position' => 60], $tard)]);
    envoyer($this->jeton, [geste($this->eleve, 'lecon.progression', ['lecon' => $lecon->uuid, 'etat' => 'comprise', 'position' => 100], $tot)])
        ->assertJsonPath('resultats.0.verdict', 'acceptee');

    $progression = ProgressionLecon::sole();
    expect($progression->etat)->toBe(EtatLecon::ARevoir)
        ->and($progression->position)->toBe(60);
});

test('position et état sont indépendants ; « aucun » efface l\'état', function () {
    $lecon = leconPubliee(notionDeTest());

    envoyer($this->jeton, [
        geste($this->eleve, 'lecon.progression', ['lecon' => $lecon->uuid, 'etat' => 'comprise'], '2026-10-31T18:00:00.000Z'),
        geste($this->eleve, 'lecon.progression', ['lecon' => $lecon->uuid, 'position' => 75], '2026-10-31T18:05:00.000Z'),
    ]);

    expect(ProgressionLecon::sole()->etat)->toBe(EtatLecon::Comprise)
        ->and(ProgressionLecon::sole()->position)->toBe(75);

    envoyer($this->jeton, [geste($this->eleve, 'lecon.progression', ['lecon' => $lecon->uuid, 'etat' => 'aucun'], '2026-10-31T18:10:00.000Z')]);

    expect(ProgressionLecon::sole()->etat)->toBeNull()
        ->and(ProgressionLecon::sole()->position)->toBe(75);
});

test('une leçon que l\'élève ne peut pas lire est refusée', function () {
    $ailleurs = leconPubliee(notionAilleurs('maths', 'Terminale'));

    envoyer($this->jeton, [geste($this->eleve, 'lecon.progression', ['lecon' => $ailleurs->uuid, 'position' => 10])])
        ->assertJsonPath('resultats.0.verdict', 'rejetee')
        ->assertJsonPath('resultats.0.motif', 'Cette leçon n\'est plus proposée.');

    expect(ProgressionLecon::count())->toBe(0);
});
