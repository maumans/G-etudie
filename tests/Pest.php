<?php

use App\Enums\Role;
use App\Enums\TypeQuestion;
use App\Models\Chapitre;
use App\Models\Classe;
use App\Models\Examen;
use App\Models\Lecon;
use App\Models\Matiere;
use App\Models\Notion;
use App\Models\Question;
use App\Models\Serie;
use App\Models\User;
use App\Services\ContenuService;
use App\Services\HorsLigne\RegistreOperations;
use App\Services\ProfilEleveService;
use App\Services\Sms\EnvoiSms;
use Database\Seeders\ReferentielSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Tests\Doubles\OperationDeTest;
use Tests\Doubles\SmsEnMemoire;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| The closure you provide to your test functions is always bound to a specific PHPUnit test
| case class. By default, that class is "PHPUnit\Framework\TestCase". Of course, you may
| need to change it using the "pest()" function to bind different classes or traits.
|
*/

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature');

/*
|--------------------------------------------------------------------------
| Expectations
|--------------------------------------------------------------------------
|
| When you're writing tests, you often need to check that values meet certain conditions. The
| "expect()" function gives you access to a set of "expectations" methods that you can use
| to assert different things. Of course, you may extend the Expectation API at any time.
|
*/

expect()->extend('toBeOne', function () {
    return $this->toBe(1);
});

/*
|--------------------------------------------------------------------------
| Functions
|--------------------------------------------------------------------------
|
| While Pest is very powerful out-of-the-box, you may have some testing code specific to your
| project that you don't want to repeat in every file. Here you can also expose helpers as
| global functions to help you to reduce the number of lines of code in your test files.
|
*/

/**
 * Remplace l'envoi de SMS par un double qui garde les messages, pour lire le
 * code reçu.
 */
function smsEnMemoire(): SmsEnMemoire
{
    $sms = new SmsEnMemoire;
    app()->instance(EnvoiSms::class, $sms);

    return $sms;
}

/** Hors ligne : inscrit le type d'opération de test et remet son journal à zéro. */
function brancherOperationDeTest(): void
{
    OperationDeTest::$executions = [];
    app(RegistreOperations::class)->inscrire(OperationDeTest::TYPE, OperationDeTest::class);
}

/** Connecte le compte et enregistre son appareil comme le fait l'application ; rend le jeton. */
function appareilDe(User $user, ?string $jeton = null): string
{
    $reponse = test()->actingAs($user)
        ->withHeaders($jeton !== null ? ['X-Appareil' => $jeton] : [])
        ->getJson(route('sync.etat'))
        ->assertOk();

    return $reponse->json('appareil') ?? $jeton;
}

/**
 * Une opération de la file, telle que l'appareil l'envoie.
 *
 * @param  array<string, mixed>  $champs
 * @return array<string, mixed>
 */
function operation(User $auteur, array $champs = []): array
{
    return [
        'uuid' => (string) Str::uuid7(),
        'type' => OperationDeTest::TYPE,
        'auteur_id' => $auteur->id,
        'saisi_le' => now()->toIso8601ZuluString('millisecond'),
        'depend_de' => null,
        'charge' => ['valeur' => 12],
        ...$champs,
    ];
}

/**
 * Envoie un lot ; horloge à l'heure par défaut (décalage nul, mesuré il y a
 * une minute).
 *
 * @param  list<array<string, mixed>>  $operations
 * @param  array<string, mixed>  $horloge
 */
function envoyer(string $jeton, array $operations, array $horloge = []): TestResponse
{
    return test()->postJson(route('sync.operations'), [
        'appareil' => $jeton,
        'decalage_horloge_ms' => 0,
        'mesure_le' => now()->subMinute()->toIso8601ZuluString('millisecond'),
        'envoye_le' => now()->toIso8601ZuluString('millisecond'),
        'operations' => $operations,
        ...$horloge,
    ]);
}

/**
 * Une notion du programme, comme le responsable pédagogique la saisit :
 * référentiel semé, chapitre de Maths en 10e année.
 */
function notionDeTest(string $titre = 'Le théorème de Pythagore'): Notion
{
    test()->seed(ReferentielSeeder::class);

    $chapitre = Chapitre::firstOrCreate([
        'matiere_id' => Matiere::where('slug', 'maths')->value('id'),
        'classe_id' => Classe::where('nom', '10e année')->value('id'),
        'titre' => 'Géométrie du triangle',
    ], ['ordre' => 1]);

    return Notion::firstOrCreate(['chapitre_id' => $chapitre->id, 'titre' => $titre], ['ordre' => 1]);
}

/**
 * Un document de leçon valide (App\Support\BlocsContenu), avec une formule.
 *
 * @return array<string, mixed>
 */
function blocsDeTest(string $texte = 'Dans un triangle rectangle :'): array
{
    return ['type' => 'doc', 'content' => [
        ['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => $texte]]],
        ['type' => 'formuleBloc', 'attrs' => ['latex' => 'a^2 + b^2 = c^2']],
    ]];
}

/**
 * Un élève qui a fini son parcours d'accueil, comme le fait l'écran :
 * référentiel semé, profil enregistré par ProfilEleveService.
 */
function eleveAvecProfil(string $examen = 'BEPC', ?string $serie = null, int $objectif = 15): User
{
    test()->seed(ReferentielSeeder::class);

    $eleve = User::factory()->create();
    $modele = Examen::where('code', $examen)->sole();
    $serieId = $serie !== null ? Serie::where('examen_id', $modele->id)->where('code', $serie)->value('id') : null;
    app(ProfilEleveService::class)->enregistrer($eleve, $modele->id, $serieId, null, $objectif);

    return $eleve->fresh();
}

/**
 * Une leçon publiée comme dans la réalité : écrite par un rédacteur, relue
 * et publiée par un autre (ContenuService).
 */
function leconPubliee(Notion $notion, string $titre = 'Le théorème de Pythagore', ?array $blocs = null): Lecon
{
    $contenu = app(ContenuService::class);
    $redacteur = User::factory()->avecRole(Role::Redacteur)->create();
    $relecteur = User::factory()->avecRole(Role::Relecteur)->create();

    $lecon = $contenu->creerLecon($redacteur, $notion, $titre);
    $lecon = $contenu->enregistrerBrouillon($lecon, $redacteur, $titre, $blocs ?? blocsDeTest(), 0);

    return $contenu->publier($contenu->soumettre($lecon, $redacteur), $relecteur)->fresh();
}

/** Une notion d'une autre matière ou classe que celle de notionDeTest(). */
function notionAilleurs(string $matiere, string $classe, string $titre = 'Notion ailleurs'): Notion
{
    test()->seed(ReferentielSeeder::class);

    $chapitre = Chapitre::firstOrCreate([
        'matiere_id' => Matiere::where('slug', $matiere)->value('id'),
        'classe_id' => Classe::where('nom', $classe)->value('id'),
        'titre' => "Chapitre de {$matiere}",
    ], ['ordre' => 1]);

    return Notion::firstOrCreate(['chapitre_id' => $chapitre->id, 'titre' => $titre], ['ordre' => 1]);
}

/** Un QCM publié, bonne réponse « b ». */
function questionDeTest(Notion $notion, string $statut = 'publie'): Question
{
    return Question::create([
        'uuid' => (string) Str::uuid7(),
        'notion_id' => $notion->id,
        'type' => TypeQuestion::QcmUne,
        'enonce' => blocsDeTest('Combien mesure l\'hypoténuse ?'),
        'donnees' => ['options' => [['id' => 'a', 'texte' => '4 cm'], ['id' => 'b', 'texte' => '5 cm'], ['id' => 'c', 'texte' => '7 cm']]],
        'reponse_attendue' => ['option' => 'b'],
        'explication' => blocsDeTest('3² + 4² = 25.'),
        'statut' => $statut,
        'version' => 1,
    ]);
}

/**
 * Un geste élève de la file, tel que l'appareil l'envoie.
 *
 * @param  array<string, mixed>  $charge
 * @return array<string, mixed>
 */
function geste(User $auteur, string $type, array $charge, ?string $saisiLe = null): array
{
    return [
        'uuid' => (string) Str::uuid7(),
        'type' => $type,
        'auteur_id' => $auteur->id,
        'saisi_le' => $saisiLe ?? now()->toIso8601ZuluString('millisecond'),
        'depend_de' => null,
        'charge' => $charge,
    ];
}
