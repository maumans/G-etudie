<?php

use App\Support\HorlogeDemo;
use Carbon\CarbonImmutable;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;

/*
 * L'horloge des captures d'écran (développement seulement) : avec le cookie
 * `horloge_demo=1`, le contrôleur voit l'instant du semis de la
 * démonstration ; la session, elle, garde la vraie heure.
 */

beforeEach(function () {
    Storage::fake('local');
    Route::middleware('web')->get('/__essai-horloge', fn () => response()->json([
        'maintenant' => now()->toIso8601String(),
    ]));
    HorlogeDemo::noter(CarbonImmutable::parse('2026-11-05 21:30:00'));
});

test('avec le cookie, la requête est traitée à l\'instant du semis', function () {
    $this->withUnencryptedCookie(HorlogeDemo::COOKIE, '1')
        ->get('/__essai-horloge')
        ->assertJsonPath('maintenant', '2026-11-05T21:30:00+00:00');

    // L'horloge est rendue après la requête : rien ne fuit vers la suite.
    expect(Carbon::getTestNow())->toBeNull();
});

test('sans le cookie, la vraie heure', function () {
    Carbon::setTestNow('2026-11-07 10:00:00');

    $this->get('/__essai-horloge')->assertJsonPath('maintenant', '2026-11-07T10:00:00+00:00');
    // Une horloge déjà figée par un test est respectée.
    $this->withUnencryptedCookie(HorlogeDemo::COOKIE, '1')->get('/__essai-horloge');
    expect(Carbon::getTestNow()?->toDateTimeString())->toBe('2026-11-07 10:00:00');

    Carbon::setTestNow();
});

test('en production, le cookie est sans effet', function () {
    app()->detectEnvironment(fn () => 'production');

    expect(HorlogeDemo::autorisee())->toBeFalse();
    $reponse = $this->withUnencryptedCookie(HorlogeDemo::COOKIE, '1')->get('/__essai-horloge');
    expect($reponse->json('maintenant'))->not->toStartWith('2026-11-05');

    app()->detectEnvironment(fn () => 'testing');
});

test('la session est enregistrée à la vraie heure, pas à l\'instant du semis', function () {
    // Sinon la dernière activité reculerait de deux jours et la session
    // expirerait pour les requêtes suivantes, sans le cookie.
    config(['session.driver' => 'database']);
    Carbon::setTestNow('2026-11-07 10:00:00');

    $this->withUnencryptedCookie(HorlogeDemo::COOKIE, '1')->get('/__essai-horloge')->assertOk();

    expect(DB::table('sessions')->max('last_activity'))
        ->toBe(Carbon::parse('2026-11-07 10:00:00')->getTimestamp());

    Carbon::setTestNow();
});

test('sans semis noté ni compte de démonstration, rien n\'est figé', function () {
    Storage::fake('local');

    expect(HorlogeDemo::instant())->toBeNull();
    $this->withUnencryptedCookie(HorlogeDemo::COOKIE, '1')
        ->get('/__essai-horloge')
        ->assertJsonPath('maintenant', fn (string $valeur) => ! str_starts_with($valeur, '2026-11-05'));
});
