<?php

use App\Models\Chapitre;
use App\Models\Classe;
use App\Models\Matiere;
use App\Models\Notion;
use App\Models\User;
use App\Services\HorsLigne\RegistreOperations;
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
