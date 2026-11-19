<?php

use App\Enums\Role;
use App\Enums\TypeQuestion;
use App\Models\Chapitre;
use App\Models\Maitrise;
use App\Models\Matiere;
use App\Models\Notion;
use App\Models\PointEffort;
use App\Models\Question;
use App\Models\Seance;
use App\Models\SerieJour;
use App\Models\Tentative;
use App\Models\User;
use App\Services\ContenuService;
use App\Services\CultureService;
use App\Services\SeanceService;
use App\Services\TentativeService;
use App\Support\CatalogueEleve;
use Carbon\CarbonImmutable;
use Database\Seeders\ReferentielSeeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Testing\AssertableInertia as Assert;

/*
 * Lot 12 (PLAN M10) : la culture générale — matière transversale, hors
 * jauge ; question du jour la même pour tous ; quiz ; source obligatoire.
 */

afterEach(fn () => Carbon::setTestNow());

function themeCulture(string $titre = 'Guinée', string $notion = 'Géographie'): Notion
{
    test()->seed(ReferentielSeeder::class);

    $chapitre = Chapitre::firstOrCreate([
        'matiere_id' => Matiere::where('slug', 'culture')->value('id'),
        'classe_id' => null,
        'titre' => $titre,
    ], ['ordre' => 1]);

    return Notion::firstOrCreate(['chapitre_id' => $chapitre->id, 'titre' => $notion], ['ordre' => 1]);
}

function questionCulture(Notion $notion, string $texte = 'Quelle est la capitale de la Guinée ?', ?string $sources = 'Wikipédia, article « Conakry ».'): Question
{
    $contenu = app(ContenuService::class);
    $redacteur = User::factory()->avecRole(Role::Redacteur)->create();
    $relecteur = User::factory()->avecRole(Role::Relecteur)->create();

    $question = $contenu->creerQuestion($redacteur, $notion, TypeQuestion::QcmUne);
    $question = $contenu->enregistrerQuestion($question, $redacteur, [
        'enonce' => blocsDeTest($texte),
        'donnees' => ['options' => [['id' => 'a', 'texte' => 'Kankan'], ['id' => 'b', 'texte' => 'Conakry']]],
        'attendue' => ['option' => 'b'],
        'indices' => [],
        'corrige' => [['titre' => '', 'blocs' => blocsDeTest('Conakry est la capitale.')]],
        'difficulte' => 1,
        'sources' => $sources,
    ], 0);

    return $contenu->publier($contenu->soumettre($question, $redacteur), $relecteur)->fresh();
}

test('la culture générale est transversale : tous les examens la voient, hors séance du jour, hors devoirs', function () {
    $question = questionCulture(themeCulture());
    $bepc = eleveAvecProfil('BEPC');
    $bac = eleveAvecProfil('BAC', 'SE');

    expect(Matiere::where('slug', 'culture')->value('transversale'))->toBeTrue()
        ->and(CatalogueEleve::peutRecevoirQuestion($bepc, $question))->toBeTrue()
        ->and(CatalogueEleve::peutRecevoirQuestion($bac, $question))->toBeTrue()
        // Ni la séance du jour ni un devoir n'en contiennent.
        ->and(CatalogueEleve::questions(CatalogueEleve::profil($bepc))->whereKey($question->id)->exists())->toBeFalse();

    $this->actingAs($bac)->get(route('eleve.culture'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('eleve/culture')
            ->where('jour.question.uuid', $question->uuid)
            ->where('jour.question.sources', 'Wikipédia, article « Conakry ».')
            ->where('themes.0.titre', 'Guinée')
            ->where('themes.0.questions', 1));
});

test('une question de culture sans source ne part pas en relecture', function () {
    $notion = themeCulture();
    $contenu = app(ContenuService::class);
    $redacteur = User::factory()->avecRole(Role::Redacteur)->create();
    $question = $contenu->creerQuestion($redacteur, $notion, TypeQuestion::VraiFaux);
    $contenu->enregistrerQuestion($question, $redacteur, [
        'enonce' => blocsDeTest('Le Niger prend sa source en Guinée.'),
        'donnees' => [], 'attendue' => ['valeur' => true], 'indices' => [],
        'corrige' => [['titre' => '', 'blocs' => blocsDeTest('Vrai.')]], 'difficulte' => 1, 'sources' => '   ',
    ], 0);

    expect(fn () => $contenu->soumettre($question->fresh(), $redacteur))
        ->toThrow(ValidationException::class, 'Une question de culture générale cite sa source');
});

test('la question du jour est la même pour tous, change chaque jour, et passe par toutes avant de revenir', function () {
    $notion = themeCulture();
    $questions = collect(range(1, 4))->map(fn (int $i) => questionCulture($notion, "Question de culture n° {$i}"));
    $culture = app(CultureService::class);
    $lundi = CarbonImmutable::parse('2026-11-16');

    $vues = collect(range(0, 3))->map(fn (int $j) => $culture->questionDuJour($lundi->addDays($j))?->id);

    expect($vues->unique()->count())->toBe(4)
        ->and($vues->sort()->values()->all())->toBe($questions->pluck('id')->sort()->values()->all())
        // Le cinquième jour, le cycle recommence.
        ->and($culture->questionDuJour($lundi->addDays(4))?->id)->toBe($vues[0])
        // Deux élèves, même jour : même question.
        ->and($culture->etatDuJour(eleveAvecProfil('BEPC'), $lundi)['question']['uuid'])
        ->toBe($culture->etatDuJour(eleveAvecProfil('BAC', 'SS'), $lundi)['question']['uuid']);
});

test('répondre à la question du jour par la file : compté une fois, recorrigé, sans toucher à la maîtrise', function () {
    $question = questionCulture(themeCulture());
    $eleve = eleveAvecProfil('BEPC');
    $jeton = appareilDe($eleve);
    $operation = geste($eleve, 'tentative.enregistrer', [
        'question' => $question->uuid,
        'version' => $question->numeroPublie(),
        // L'appareil prétend « juste » ; le serveur recorrige.
        'reponse' => ['option' => 'a'],
        'seance' => null,
        'duree_secondes' => 12,
        'indices_utilises' => 0,
    ]);

    envoyer($jeton, [$operation])->assertOk();
    envoyer($jeton, [$operation])->assertOk();

    expect(Tentative::query()->where('user_id', $eleve->id)->count())->toBe(1)
        ->and(Tentative::query()->where('user_id', $eleve->id)->value('score'))->toBe(0)
        ->and(Maitrise::query()->where('user_id', $eleve->id)->exists())->toBeFalse();

    $this->actingAs($eleve)->get(route('eleve.culture'))
        ->assertInertia(fn (Assert $page) => $page->where('jour.repondue', true)->where('jour.score', 0));
});

test('un quiz de culture n\'est jamais la séance du jour ; hors ligne, un quiz est préparé dans l\'instantané', function () {
    $notion = themeCulture();
    foreach (range(1, 6) as $i) {
        questionCulture($notion, "Question {$i}");
    }
    $maths = notionDeTest();
    questionDeTest($maths);
    $eleve = eleveAvecProfil('BEPC');

    $this->actingAs($eleve)->post(route('eleve.culture.quiz'))->assertRedirect();
    $quiz = Seance::query()->where('user_id', $eleve->id)->where('culture', true)->whereNotNull('jour')->firstOrFail();

    expect(count($quiz->questions))->toBe(CultureService::QUESTIONS_PAR_QUIZ)
        ->and(app(SeanceService::class)->enCours($eleve)?->id)->not->toBe($quiz->id);

    $instantane = $this->actingAs($eleve)->getJson(route('eleve.instantane'))->assertOk();

    expect($instantane->json('seances_matieres.culture'))->toHaveCount(1)
        ->and($instantane->json('seances_matieres.culture.0.props.seance.culture'))->toBeTrue()
        ->and($instantane->json('culture_jours'))->toHaveCount(CultureService::JOURS_D_AVANCE)
        // Les séances du jour ne contiennent aucune question de culture.
        ->and(collect($instantane->json('seances'))->flatMap(fn ($s) => $s['props']['questions'])->pluck('matiere')->unique()->values()->all())->toBe(['maths']);
});

test('un thème inconnu répond 404 ; un thème sans question le dit', function () {
    $eleve = eleveAvecProfil('BEPC');
    $vide = themeCulture('Monde', 'Sciences')->chapitre;

    $this->actingAs($eleve)->post(route('eleve.culture.quiz'), ['theme' => 999999])->assertNotFound();
    $this->actingAs($eleve)->post(route('eleve.culture.quiz'), ['theme' => $vide->id])
        ->assertRedirect(route('eleve.culture'));

    expect(Seance::query()->where('user_id', $eleve->id)->exists())->toBeFalse();
});

test('l\'historique des quiz compte la dernière réponse à chaque question', function () {
    $notion = themeCulture();
    $questions = collect(range(1, 2))->map(fn ($i) => questionCulture($notion, "Q{$i}"));
    $eleve = eleveAvecProfil('BEPC');
    $seance = Seance::create([
        'uuid' => (string) Str::uuid7(), 'user_id' => $eleve->id, 'jour' => today()->toDateString(), 'culture' => true,
        'questions' => $questions->pluck('id')->all(), 'duree_minutes' => 5, 'genere_le' => now(),
    ]);
    $tentatives = app(TentativeService::class);
    $quand = CarbonImmutable::now()->subMinutes(10);

    foreach ([['a', 0], ['b', 1], ['b', 2]] as [$option, $rang]) {
        $question = $questions[$rang === 0 ? 0 : ($rang === 1 ? 0 : 1)];
        $tentatives->enregistrer($eleve, (string) Str::uuid7(), $question, $question->numeroPublie(), ['option' => $option], $seance, 10, $quand->addMinutes($rang), $quand->addMinutes($rang));
    }
    app(SeanceService::class)->terminer($eleve, $seance->refresh(), $quand->addMinutes(5));

    expect(app(CultureService::class)->historique($eleve)[0])
        ->toMatchArray(['questions' => 2, 'justes' => 2, 'score' => 100]);
});

test('finir un quiz de culture compte pour la série, pas comme une séance du jour', function () {
    $notion = themeCulture();
    $question = questionCulture($notion);
    $eleve = eleveAvecProfil('BEPC');
    $this->actingAs($eleve)->post(route('eleve.culture.quiz'))->assertRedirect();
    $quiz = Seance::query()->where('user_id', $eleve->id)->where('culture', true)->firstOrFail();

    app(TentativeService::class)->enregistrer($eleve, (string) Str::uuid7(), $question, $question->numeroPublie(), ['option' => 'b'], $quiz, 10, CarbonImmutable::now(), CarbonImmutable::now());
    app(SeanceService::class)->terminer($eleve, $quiz->refresh(), CarbonImmutable::now());

    expect(PointEffort::query()->where('user_id', $eleve->id)->where('source', 'seance')->exists())->toBeFalse()
        ->and(SerieJour::query()->where('user_id', $eleve->id)->whereDate('jour', today())->value('objectif_atteint'))->toBeFalsy()
        ->and(SerieJour::query()->where('user_id', $eleve->id)->whereDate('jour', today())->exists())->toBeTrue();

    $this->actingAs($eleve)->get(route('eleve.accueil'))
        ->assertInertia(fn (Assert $page) => $page->where('tableau.premiers_pas.3', ['cle' => 'seance', 'fait' => false]));
});
