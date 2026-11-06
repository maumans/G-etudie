<?php

use App\Enums\Role;
use App\Http\Middleware\OrdinateurPartage;
use App\Models\Appareil;
use App\Models\EntreeJournalAcces;
use App\Models\OperationSynchronisee;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Doubles\OperationDeTest;

/*
 * Lot 7, HL6 (HORS_LIGNE.md A.7) : plusieurs profils sur un téléphone.
 * Chaque élève rattaché reçoit un jeton de profil propre au téléphone ; avec
 * lui (et le code local, vérifié par l'appareil), on change de profil sans
 * mot de passe, et ses réponses partent même quand la session est celle d'un
 * autre. Sans jeton valable, ses gestes attendent — jamais attribués à un
 * autre.
 */

beforeEach(fn () => brancherOperationDeTest());

afterEach(fn () => Carbon::setTestNow());

/**
 * Le profil se connecte sur le téléphone : jeton d'appareil et jeton de profil.
 *
 * @return array{appareil: string, profil: string|null}
 */
function surLeTelephone(User $eleve, ?string $appareil = null): array
{
    test()->actingAs($eleve);
    $reponse = test()->withHeaders($appareil !== null ? ['X-Appareil' => $appareil] : [])
        ->getJson(route('sync.etat'))->assertOk();
    test()->flushHeaders();

    return ['appareil' => $reponse->json('appareil') ?? $appareil, 'profil' => $reponse->json('jeton_profil')];
}

test('un élève reçoit son jeton de profil une fois ; présenté, il n\'est pas renouvelé', function () {
    $eleve = eleveAvecProfil();
    ['appareil' => $appareil, 'profil' => $jeton] = surLeTelephone($eleve);

    expect($jeton)->toHaveLength(64);

    $encore = $this->withHeaders(['X-Appareil' => $appareil, 'X-Profil' => $jeton])->getJson(route('sync.etat'))->assertOk();
    expect($encore->json('jeton_profil'))->toBeNull()
        ->and(DB::table('appareil_profils')->value('jeton_profil_hache'))->toBe(hash('sha256', $jeton));

    // Sans le jeton (base locale effacée) : un nouveau, l'ancien ne vaut plus.
    $this->flushHeaders();
    $neuf = $this->withHeaders(['X-Appareil' => $appareil])->getJson(route('sync.etat'))->json('jeton_profil');
    expect($neuf)->toHaveLength(64)->not->toBe($jeton);
});

test('ni le personnel, ni un ordinateur partagé ne reçoivent de jeton de profil', function () {
    $redacteur = User::factory()->avecRole(Role::Redacteur)->create();
    expect(surLeTelephone($redacteur)['profil'])->toBeNull();

    $eleve = eleveAvecProfil();
    $this->actingAs($eleve)->withSession([OrdinateurPartage::CLE => true]);
    expect($this->getJson(route('sync.etat'))->json('jeton_profil'))->toBeNull();
});

test('changer de profil : le jeton du profil ouvre sa session, sans mot de passe', function () {
    $aine = eleveAvecProfil();
    $cadet = eleveAvecProfil();
    ['appareil' => $appareil, 'profil' => $jetonAine] = surLeTelephone($aine);
    surLeTelephone($cadet, $appareil);

    // Le cadet est connecté ; l'aîné reprend la main avec son jeton.
    $this->postJson(route('appareil.profils.basculer'), ['appareil' => $appareil, 'profil' => $aine->id, 'jeton' => $jetonAine])
        ->assertOk()->assertJsonPath('utilisateur.id', $aine->id);

    $this->assertAuthenticatedAs($aine);
    expect(EntreeJournalAcces::where('action', 'profil.bascule')->where('auteur_id', $aine->id)->exists())->toBeTrue();
});

test('changer de profil sans session (expirée) marche aussi', function () {
    $eleve = eleveAvecProfil();
    ['appareil' => $appareil, 'profil' => $jeton] = surLeTelephone($eleve);
    auth()->logout();

    $this->postJson(route('appareil.profils.basculer'), ['appareil' => $appareil, 'profil' => $eleve->id, 'jeton' => $jeton])->assertOk();
    $this->assertAuthenticatedAs($eleve);
});

test('un jeton faux, d\'un autre profil, retiré ou vieux de plus de 30 jours ne vaut rien (même réponse)', function () {
    Carbon::setTestNow('2026-11-06 10:00');
    $aine = eleveAvecProfil();
    $cadet = eleveAvecProfil();
    ['appareil' => $appareil, 'profil' => $jetonAine] = surLeTelephone($aine);
    ['profil' => $jetonCadet] = surLeTelephone($cadet, $appareil);
    auth()->logout();
    $essayer = fn (int $profil, string $jeton) => $this->postJson(route('appareil.profils.basculer'), ['appareil' => $appareil, 'profil' => $profil, 'jeton' => $jeton]);

    $essayer($aine->id, str_repeat('x', 64))->assertStatus(422)->assertJsonPath('message', 'Ce profil doit se reconnecter avec son mot de passe.');
    $essayer($aine->id, $jetonCadet)->assertStatus(422);
    $this->postJson(route('appareil.profils.basculer'), ['appareil' => 'inconnu', 'profil' => $aine->id, 'jeton' => $jetonAine])->assertStatus(422);
    $this->assertGuest();

    // 31 jours sans usage : il faut le mot de passe.
    Carbon::setTestNow('2026-12-08 10:00');
    $essayer($aine->id, $jetonAine)->assertStatus(422);

    // Utilisé il y a 29 jours : 30 jours glissants.
    Carbon::setTestNow('2026-12-05 09:00');
    $essayer($cadet->id, $jetonCadet)->assertOk();
});

test('le personnel ne change jamais de profil sans mot de passe', function () {
    $eleve = eleveAvecProfil();
    ['appareil' => $appareil, 'profil' => $jeton] = surLeTelephone($eleve);

    // Un compte devenu personnel entre-temps : son jeton ne vaut plus.
    $eleve->syncRoles([Role::Redacteur]);
    auth()->logout();

    $this->postJson(route('appareil.profils.basculer'), ['appareil' => $appareil, 'profil' => $eleve->id, 'jeton' => $jeton])->assertStatus(422);
});

test('la limite de débit protège le changement de profil', function () {
    foreach (range(1, 10) as $_) {
        $this->postJson(route('appareil.profils.basculer'), ['appareil' => 'x', 'profil' => 1, 'jeton' => 'y'])->assertStatus(422);
    }

    $this->postJson(route('appareil.profils.basculer'), ['appareil' => 'x', 'profil' => 1, 'jeton' => 'y'])->assertStatus(429);
});

test('A.15 n° 4 — les réponses d\'un autre profil partent avec son jeton, à son nom', function () {
    $aine = eleveAvecProfil();
    $cadet = eleveAvecProfil();
    ['appareil' => $appareil, 'profil' => $jetonAine] = surLeTelephone($aine);
    surLeTelephone($cadet, $appareil);

    // Session du cadet ; la file contient aussi un geste de l'aîné.
    $gesteAine = operation($aine);
    $gesteCadet = operation($cadet);

    $this->postJson(route('sync.operations'), [
        'appareil' => $appareil,
        'profils' => [$aine->id => $jetonAine],
        'operations' => [$gesteAine, $gesteCadet],
    ])->assertOk()
        ->assertJsonPath('resultats.0.verdict', 'acceptee')
        ->assertJsonPath('resultats.0.resultat.auteur', $aine->id)
        ->assertJsonPath('resultats.1.resultat.auteur', $cadet->id);

    expect(OperationSynchronisee::pluck('auteur_id', 'uuid')->all())->toBe([
        $gesteAine['uuid'] => $aine->id,
        $gesteCadet['uuid'] => $cadet->id,
    ]);
});

test('sans jeton valable, le geste d\'un autre profil est reporté', function () {
    $aine = eleveAvecProfil();
    $cadet = eleveAvecProfil();
    ['appareil' => $appareil] = surLeTelephone($aine);
    surLeTelephone($cadet, $appareil);

    $this->postJson(route('sync.operations'), [
        'appareil' => $appareil,
        'profils' => [$aine->id => str_repeat('z', 64)],
        'operations' => [operation($aine)],
    ])->assertOk()->assertJsonPath('resultats.0.verdict', 'reporte');

    expect(OperationDeTest::$executions)->toBe([]);
});

test('se retirer du téléphone : le jeton ne vaut plus, les gestes attendent une nouvelle connexion', function () {
    $aine = eleveAvecProfil();
    $cadet = eleveAvecProfil();
    ['appareil' => $appareil, 'profil' => $jetonAine] = surLeTelephone($aine);

    $this->postJson(route('appareil.profils.retirer'), ['appareil' => $appareil])->assertOk();
    surLeTelephone($cadet, $appareil);

    $this->postJson(route('sync.operations'), [
        'appareil' => $appareil,
        'profils' => [$aine->id => $jetonAine],
        'operations' => [operation($aine)],
    ])->assertJsonPath('resultats.0.verdict', 'reporte');
    $this->postJson(route('appareil.profils.basculer'), ['appareil' => $appareil, 'profil' => $aine->id, 'jeton' => $jetonAine])->assertStatus(422);

    // Il se reconnecte (mot de passe) : rattaché de nouveau, nouveau jeton.
    expect(surLeTelephone($aine, $appareil)['profil'])->toHaveLength(64)->not->toBe($jetonAine);
});

test('« Mon compte › Appareils » : ses appareils ; retirer celui d\'un autre répond 404', function () {
    $eleve = eleveAvecProfil();
    $autre = eleveAvecProfil();
    ['appareil' => $jeton] = surLeTelephone($eleve);
    surLeTelephone($autre);
    $sien = Appareil::query()->whereHas('profils', fn ($q) => $q->whereKey($eleve->id))->sole();
    $etranger = Appareil::query()->whereHas('profils', fn ($q) => $q->whereKey($autre->id))->sole();

    $this->actingAs($eleve)->get(route('compte.appareils.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('compte/appareils')
            ->has('appareils', 1)
            ->where('appareils.0.uuid', $sien->uuid));

    $this->delete(route('compte.appareils.retirer', $etranger))->assertNotFound();
    $this->from(route('compte.appareils.index'))->delete(route('compte.appareils.retirer', $sien))->assertRedirect(route('compte.appareils.index'));

    expect($sien->aPourProfil($eleve))->toBeFalse()
        ->and($jeton)->toBeString();
});

test('ordinateur partagé : coché à la connexion, la session s\'arrête à la fermeture du navigateur', function () {
    $eleve = eleveAvecProfil();

    $this->post(route('login.store'), [
        'telephone' => $eleve->telephone,
        'password' => 'password',
        'ordinateur_partage' => '1',
    ])->assertRedirect();

    $this->assertAuthenticatedAs($eleve);
    expect(session(OrdinateurPartage::CLE))->toBeTrue();

    $this->get(route('eleve.accueil'))->assertInertia(fn (Assert $page) => $page->where('appareil_partage', true));
    expect(config('session.expire_on_close'))->toBeTrue();
});

test('sans la case, rien ne change : 30 jours, et l\'appareil garde le profil', function () {
    $eleve = eleveAvecProfil();

    $this->post(route('login.store'), ['telephone' => $eleve->telephone, 'password' => 'password'])->assertRedirect();

    expect(session(OrdinateurPartage::CLE))->toBeFalse();
    $this->get(route('eleve.accueil'))->assertInertia(fn (Assert $page) => $page->where('appareil_partage', false));
});

test('« Appareils » montre les dix plus récents et compte les autres', function () {
    $eleve = eleveAvecProfil();

    foreach (range(1, 12) as $_) {
        surLeTelephone($eleve);
    }

    $this->actingAs($eleve)->get(route('compte.appareils.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->has('appareils', 10)
            ->where('autres', 2));
});
