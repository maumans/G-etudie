<?php

use App\Enums\FormuleAbonnement;
use App\Enums\Role;
use App\Enums\StatutPaiement;
use App\Models\Abonnement;
use App\Models\NotificationPaiement;
use App\Models\Paiement;
use App\Models\User;
use App\Services\Paiements\PasserelleSimulee;
use App\Services\PaiementService;
use Carbon\CarbonImmutable;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;
use Inertia\Testing\AssertableInertia as Assert;

/*
 * Lot 9 (PLAN M16) : paiement par mobile money, de bout en bout par les
 * vraies routes, avec la passerelle simulée. Critère d'acceptation du lot :
 * « paiement de test de bout en bout ; webhook rejoué deux fois → un seul
 * abonnement ».
 */

beforeEach(function () {
    config(['paiements.passerelle' => 'simulee']);
    $this->eleve = eleveAvecProfil('BEPC');
});

afterEach(fn () => Carbon::setTestNow());

/** Lance un paiement par l'écran « Payer ». */
function lancerPaiement(User $eleve, string $formule = 'mensuel', string $numero = '+224622123456'): Paiement
{
    test()->actingAs($eleve)
        ->post(route('eleve.paiements.store'), ['formule' => $formule, 'moyen' => 'orange_money', 'numero' => $numero])
        ->assertRedirect();

    return Paiement::query()->where('user_id', $eleve->id)->latest('id')->firstOrFail();
}

/** Envoie un webhook signé à la vraie route, comme l'opérateur. */
function envoyerWebhook(string $corps, ?string $signature = null): TestResponse
{
    return test()->call('POST', route('paiements.notifications', 'simulee'), [], [], [], [
        'CONTENT_TYPE' => 'application/json',
        'HTTP_ACCEPT' => 'application/json',
        'HTTP_X_SIGNATURE' => $signature ?? app(PasserelleSimulee::class)->signer($corps),
    ], $corps);
}

test('payer de bout en bout : écran, opérateur simulé, webhook, abonnement ouvert', function () {
    $paiement = lancerPaiement($this->eleve);

    // L'écran de suivi : en attente, avec l'adresse du faux opérateur.
    $this->get(route('eleve.paiements.show', $paiement))
        ->assertInertia(fn (Assert $page) => $page
            ->component('eleve/paiement')
            ->where('paiement.statut', 'en_attente')
            ->where('paiement.montant_gnf', 15000)
            ->where('paiement.numero', '••• ••• 56')
            ->where('paiement.url_paiement', route('dev.passerelle.show', $paiement->reference_operateur)));

    // L'écran de l'opérateur simulé donne le webhook signé ; on l'envoie.
    $accepter = null;
    $this->get(route('dev.passerelle.show', $paiement->reference_operateur))
        ->assertInertia(function (Assert $page) use (&$accepter) {
            $page->component('dev/passerelle')->where('paiement.en_attente', true);
            $accepter = $page->toArray()['props']['accepter'];
        });

    envoyerWebhook($accepter['corps'], $accepter['signature'])->assertOk()->assertJsonPath('resultat', 'reussi');

    $abonnement = Abonnement::query()->where('user_id', $this->eleve->id)->sole();
    expect($paiement->fresh()->statut)->toBe(StatutPaiement::Reussi)
        ->and($abonnement->paiement_id)->toBe($paiement->id)
        ->and($abonnement->formule)->toBe(FormuleAbonnement::Mensuel)
        ->and($abonnement->fin->toDateString())->toBe(CarbonImmutable::now()->addMonthNoOverflow()->toDateString());

    $this->get(route('eleve.paiements.show', $paiement))
        ->assertInertia(fn (Assert $page) => $page
            ->where('paiement.statut', 'reussi')
            ->where('paiement.url_paiement', null)
            ->where('droits.abonne', true)
            ->where('droits.examens_blancs.limite', null));
});

test('critère du lot 9 : un webhook rejoué deux fois n\'ouvre qu\'un abonnement', function () {
    $paiement = lancerPaiement($this->eleve, 'annee');
    $webhook = app(PasserelleSimulee::class)->notification($paiement, true, evenement: 'EVT-UNIQUE');

    envoyerWebhook($webhook['corps'])->assertOk()->assertJsonPath('resultat', 'reussi');
    envoyerWebhook($webhook['corps'])->assertOk()->assertJsonPath('resultat', 'deja_recue');
    envoyerWebhook($webhook['corps'])->assertOk()->assertJsonPath('resultat', 'deja_recue');

    // L'opérateur renvoie le même paiement sous un autre identifiant d'événement.
    $autre = app(PasserelleSimulee::class)->notification($paiement, true, evenement: 'EVT-AUTRE');
    envoyerWebhook($autre['corps'])->assertOk()->assertJsonPath('resultat', 'deja_conclu');

    expect(Abonnement::query()->where('user_id', $this->eleve->id)->count())->toBe(1)
        ->and(NotificationPaiement::query()->count())->toBe(2)
        ->and(Abonnement::query()->sole()->fin->toDateString())->toBe(CarbonImmutable::now()->addMonthsNoOverflow(10)->toDateString());
});

test('la base refuse un second abonnement pour le même paiement', function () {
    $paiement = lancerPaiement($this->eleve);
    envoyerWebhook(app(PasserelleSimulee::class)->notification($paiement, true)['corps'])->assertOk();

    expect(fn () => DB::table('abonnements')->insert([
        'user_id' => $this->eleve->id, 'formule' => 'mensuel', 'debut' => now(), 'fin' => now()->addMonth(),
        'source' => 'paiement', 'paiement_id' => $paiement->id, 'est_exemple' => false,
    ]))->toThrow(UniqueConstraintViolationException::class);
});

test('un webhook à la signature fausse est refusé et rien n\'est enregistré', function () {
    $paiement = lancerPaiement($this->eleve);
    $webhook = app(PasserelleSimulee::class)->notification($paiement, true);

    envoyerWebhook($webhook['corps'], str_repeat('0', 64))->assertUnauthorized();
    envoyerWebhook(str_replace('"montant":15000', '"montant":1', $webhook['corps']), $webhook['signature'])->assertUnauthorized();
    $this->call('POST', route('paiements.notifications', 'simulee'), [], [], [], ['CONTENT_TYPE' => 'application/json'], $webhook['corps'])
        ->assertUnauthorized();

    expect(NotificationPaiement::query()->count())->toBe(0)
        ->and($paiement->fresh()->statut)->toBe(StatutPaiement::EnAttente)
        ->and(Abonnement::query()->count())->toBe(0);
});

test('un montant différent de la formule ne vaut pas paiement', function () {
    $paiement = lancerPaiement($this->eleve);
    $webhook = app(PasserelleSimulee::class)->notification($paiement, true, montant: 1000);

    envoyerWebhook($webhook['corps'])->assertOk()->assertJsonPath('resultat', 'montant_different');

    expect($paiement->fresh()->statut)->toBe(StatutPaiement::Echoue)
        ->and($paiement->fresh()->motif_echec)->toContain('montant')
        ->and(Abonnement::query()->count())->toBe(0);
});

test('un paiement refusé par le payeur n\'ouvre rien, et l\'écran propose de réessayer', function () {
    $paiement = lancerPaiement($this->eleve);
    envoyerWebhook(app(PasserelleSimulee::class)->notification($paiement, false)['corps'])->assertOk()->assertJsonPath('resultat', 'echoue');

    // Un succès arrivé après coup ne change plus un paiement conclu.
    envoyerWebhook(app(PasserelleSimulee::class)->notification($paiement, true)['corps'])->assertJsonPath('resultat', 'deja_conclu');

    expect(Abonnement::query()->count())->toBe(0);
    $this->get(route('eleve.paiements.show', $paiement))
        ->assertInertia(fn (Assert $page) => $page->where('paiement.statut', 'echoue')->where('paiement.motif', 'Paiement refusé par le payeur.'));
});

test('un webhook pour une référence inconnue est gardé, sans effet', function () {
    $corps = json_encode(['evenement' => 'EVT-X', 'reference' => 'SIM-INCONNUE', 'statut' => 'SUCCESS', 'montant' => 15000, 'devise' => 'GNF']);

    envoyerWebhook($corps)->assertOk()->assertJsonPath('resultat', 'paiement_inconnu');
    expect(NotificationPaiement::query()->sole()->resultat)->toBe('paiement_inconnu')
        ->and(Abonnement::query()->count())->toBe(0);
});

test('le montant vient de la formule, et le numéro du payeur est chiffré en base', function () {
    $this->actingAs($this->eleve)->post(route('eleve.paiements.store'), [
        'formule' => 'annee', 'moyen' => 'mtn_momo', 'numero' => '622 99 88 77', 'montant_gnf' => 1,
    ])->assertRedirect();

    $paiement = Paiement::query()->sole();
    $brut = DB::table('paiements')->where('id', $paiement->id)->value('numero_payeur');

    expect($paiement->montant_gnf)->toBe(100000)
        ->and($paiement->numero_payeur)->toBe('+224622998877')
        ->and($paiement->numero_fin)->toBe('77')
        ->and($brut)->not->toContain('622998877')
        ->and($paiement->expire_le->diffInMinutes($paiement->initie_le, true))->toEqual(30.0);
});

test('payer demande un numéro vérifié (D3) et un numéro guinéen', function () {
    $nonVerifie = User::factory()->numeroNonVerifie()->create();

    $this->actingAs($nonVerifie)
        ->post(route('eleve.paiements.store'), ['formule' => 'mensuel', 'moyen' => 'orange_money', 'numero' => '+224622123456'])
        ->assertSessionHasErrors(['numero' => 'Vérifie d\'abord ton numéro : c\'est lui qui protège ton abonnement.']);

    $this->actingAs($this->eleve)
        ->post(route('eleve.paiements.store'), ['formule' => 'mensuel', 'moyen' => 'orange_money', 'numero' => '12345'])
        ->assertSessionHasErrors('numero');

    $this->actingAs($this->eleve)
        ->post(route('eleve.paiements.store'), ['formule' => 'a_vie', 'moyen' => 'orange_money', 'numero' => '+224622123456'])
        ->assertSessionHasErrors('formule');

    expect(Paiement::query()->count())->toBe(0);
});

test('sans passerelle ouverte, le paiement mobile est refusé et l\'écran le dit', function () {
    config(['paiements.passerelle' => 'aucune']);

    $this->actingAs($this->eleve)
        ->post(route('eleve.paiements.store'), ['formule' => 'mensuel', 'moyen' => 'orange_money', 'numero' => '+224622123456'])
        ->assertSessionHasErrors('numero');
    $this->get(route('eleve.abonnement'))->assertInertia(fn (Assert $page) => $page->where('mobile_money', false));

    expect(Paiement::query()->count())->toBe(0);
});

test('un élève ne voit que ses paiements (404), et le personnel n\'en lance pas', function () {
    $paiement = lancerPaiement($this->eleve);

    $this->actingAs(eleveAvecProfil('BEPC'))->get(route('eleve.paiements.show', $paiement))->assertNotFound();
    $this->actingAs(User::factory()->avecRole(Role::Redacteur)->create())
        ->post(route('eleve.paiements.store'), ['formule' => 'mensuel', 'moyen' => 'orange_money', 'numero' => '+224622123456'])
        ->assertForbidden();
});

test('payer avant la fin prolonge : la nouvelle période commence à la fin de l\'actuelle', function () {
    $actuel = abonner($this->eleve, FormuleAbonnement::Mensuel);
    $paiement = lancerPaiement($this->eleve, 'annee');
    envoyerWebhook(app(PasserelleSimulee::class)->notification($paiement, true)['corps'])->assertOk();

    $nouveau = Abonnement::query()->where('paiement_id', $paiement->id)->sole();
    expect($nouveau->debut->equalTo($actuel->fin))->toBeTrue()
        ->and($nouveau->fin->toDateString())->toBe($actuel->fin->copy()->addMonthsNoOverflow(10)->toDateString());
});

test('un paiement jamais confirmé expire ; un paiement récent attend encore', function () {
    $ancien = lancerPaiement($this->eleve);
    Carbon::setTestNow(now()->addMinutes(31));
    $recent = lancerPaiement($this->eleve);

    $bilan = app(PaiementService::class)->verifierEnAttente();

    expect($bilan['expires'])->toBe(1)
        ->and($ancien->fresh()->statut)->toBe(StatutPaiement::Expire)
        ->and($recent->fresh()->statut)->toBe(StatutPaiement::EnAttente);

    // Le webhook arrivé trop tard ne change plus rien.
    envoyerWebhook(app(PasserelleSimulee::class)->notification($ancien, true)['corps'])->assertJsonPath('resultat', 'deja_conclu');
    expect(Abonnement::query()->count())->toBe(0);

    $this->artisan('paiements:verifier')->assertSuccessful();
});

test('le faux opérateur n\'existe qu\'en développement', function () {
    $paiement = lancerPaiement($this->eleve);
    app()->detectEnvironment(fn () => 'production');

    $this->get(route('dev.passerelle.show', $paiement->reference_operateur))->assertNotFound();
    expect(PasserelleSimulee::estOuverte())->toBeFalse();
});
