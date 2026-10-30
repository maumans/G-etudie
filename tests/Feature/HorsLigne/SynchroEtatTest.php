<?php

use App\Models\Appareil;
use App\Models\User;

test('le premier contact enregistre l\'appareil et ne rend le jeton qu\'une fois', function () {
    $eleve = User::factory()->create();

    $premier = $this->actingAs($eleve)
        ->withHeader('User-Agent', 'Mozilla/5.0 (Linux; Android 13) Chrome/130.0 Mobile Safari/537.36')
        ->getJson(route('sync.etat'))
        ->assertOk()
        ->assertJsonStructure(['heure_serveur', 'csrf', 'utilisateur' => ['id'], 'packs', 'appareil']);

    $jeton = $premier->json('appareil');
    $appareil = Appareil::sole();

    expect($appareil->jeton_hache)->toBe(hash('sha256', $jeton))
        ->and($appareil->jeton_hache)->not->toBe($jeton)
        ->and($appareil->libelle)->toBe('Chrome sur Android')
        ->and($appareil->aPourProfil($eleve))->toBeTrue();

    $this->withHeader('X-Appareil', $jeton)->getJson(route('sync.etat'))
        ->assertOk()
        ->assertJsonMissingPath('appareil');

    expect(Appareil::count())->toBe(1);
});

test('un second profil sur le même appareil y est rattaché', function () {
    $aine = User::factory()->create();
    $cadet = User::factory()->create();

    $jeton = appareilDe($aine);
    appareilDe($cadet, $jeton);

    expect(Appareil::sole()->profils()->pluck('users.id')->sort()->values()->all())
        ->toBe(collect([$aine->id, $cadet->id])->sort()->values()->all());
});

test('un appareil révoqué reçoit un nouveau jeton', function () {
    $eleve = User::factory()->create();
    $jeton = appareilDe($eleve);
    Appareil::sole()->forceFill(['revoque_le' => now()])->save();

    $nouveau = appareilDe($eleve, $jeton);

    expect($nouveau)->not->toBe($jeton)->and(Appareil::count())->toBe(2);
});

test('le battement reste sous 1 Ko et n\'est jamais mis en cache', function () {
    $reponse = $this->actingAs(User::factory()->create())->getJson(route('sync.etat'));

    expect(strlen((string) $reponse->getContent()))->toBeLessThan(1024)
        ->and($reponse->headers->get('Cache-Control'))->toContain('no-store');
});

test('sans session, la synchro répond 401', function () {
    $this->getJson(route('sync.etat'))->assertUnauthorized();
    $this->postJson(route('sync.operations'), [])->assertUnauthorized();
});
