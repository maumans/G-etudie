<?php

use App\Enums\Role;
use App\Models\Abonnement;
use App\Models\CodeLiaison;
use App\Models\LienParent;
use App\Models\Paiement;
use App\Models\User;
use App\Services\Organisation\LiaisonParentService;
use App\Services\Paiements\PasserelleSimulee;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;

/*
 * Lot 11 (PLAN M15, décision 1) : le lien parent ↔ enfant naît d'un code
 * que l'élève donne ; le parent suit en lecture seule et peut payer
 * l'abonnement de son enfant (décision 2).
 */

afterEach(fn () => Carbon::setTestNow());

beforeEach(function () {
    $this->eleve = eleveAvecProfil('BEPC');
    $this->parent = User::factory()->avecRole(Role::Parent)->create();
});

/** L'élève demande un code par son écran ; renvoie le code en clair montré une fois. */
function codeDeLiaison(User $eleve): string
{
    test()->actingAs($eleve)->post(route('compte.parents.code'))->assertRedirect(route('compte.parents.index'));

    $code = null;
    test()->actingAs($eleve)->get(route('compte.parents.index'))
        ->assertInertia(function (Assert $page) use (&$code) {
            $page->component('compte/parents');
            $code = $page->toArray()['props']['code']['code'];
        });

    return $code;
}

test('l\'élève donne un code ; le parent le saisit et suit son enfant', function () {
    $code = codeDeLiaison($this->eleve);

    expect($code)->toMatch('/^\d{6}$/')
        // Seule l'empreinte est gardée.
        ->and(CodeLiaison::query()->where('empreinte', $code)->exists())->toBeFalse()
        ->and(CodeLiaison::query()->where('eleve_id', $this->eleve->id)->sole()->empreinte)->toBe(LiaisonParentService::empreinte($code));

    // Le code n'est montré qu'une fois.
    $this->actingAs($this->eleve)->get(route('compte.parents.index'))
        ->assertInertia(fn (Assert $page) => $page->where('code', null)->whereNot('code_en_cours_expire_le', null));

    $this->actingAs($this->parent)->post(route('parent.liens.store'), ['code' => substr($code, 0, 3).' '.substr($code, 3)])
        ->assertRedirect(route('parent.enfants.show', $this->eleve->id));

    expect(LienParent::query()->actifs()->where('parent_id', $this->parent->id)->where('eleve_id', $this->eleve->id)->exists())->toBeTrue();

    $this->actingAs($this->parent)->get(route('parent.enfants.show', $this->eleve))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('parent/enfant')
            ->where('suivi.eleve.prenom', $this->eleve->prenom)
            ->has('suivi.semaine', 7)
            ->where('suivi.jauge.pourcentage', 0)
            ->missing('suivi.eleve.telephone'));

    $this->actingAs($this->parent)->get(route('parent.accueil'))
        ->assertInertia(fn (Assert $page) => $page->component('parent/accueil')->has('enfants', 1));
});

test('un code sert une fois, expire après 24 h, et un nouveau code annule l\'ancien', function () {
    Carbon::setTestNow('2026-11-14 10:00');
    $code = codeDeLiaison($this->eleve);
    $autreParent = User::factory()->avecRole(Role::Parent)->create();

    $this->actingAs($this->parent)->post(route('parent.liens.store'), ['code' => $code])->assertRedirect();
    $this->actingAs($autreParent)->post(route('parent.liens.store'), ['code' => $code])->assertSessionHasErrors('code');

    $ancien = codeDeLiaison($this->eleve);
    $nouveau = codeDeLiaison($this->eleve);
    $this->actingAs($autreParent)->post(route('parent.liens.store'), ['code' => $ancien])->assertSessionHasErrors('code');

    Carbon::setTestNow('2026-11-15 10:01');
    $this->actingAs($autreParent)->post(route('parent.liens.store'), ['code' => $nouveau])->assertSessionHasErrors('code');

    expect(LienParent::query()->where('parent_id', $autreParent->id)->exists())->toBeFalse();
});

test('un parent ne voit que ses enfants : un autre élève n\'existe pas pour lui (404)', function () {
    $etranger = eleveAvecProfil('BEPC');

    $this->actingAs($this->parent)->get(route('parent.enfants.show', $etranger))->assertNotFound();
    $this->actingAs($this->parent)->get(route('parent.enfants.abonnement', $etranger))->assertNotFound();
    $this->actingAs($this->parent)->post(route('parent.enfants.paiements.store', $etranger), ['formule' => 'mensuel', 'moyen' => 'orange_money', 'numero' => '622123456'])->assertNotFound();
    expect(Paiement::query()->count())->toBe(0);
});

test('l\'élève retire le lien : le parent ne le voit plus', function () {
    $code = codeDeLiaison($this->eleve);
    $this->actingAs($this->parent)->post(route('parent.liens.store'), ['code' => $code]);
    $lien = LienParent::query()->sole();

    // Un autre élève ne peut pas retirer ce lien.
    $this->actingAs(eleveAvecProfil('BEPC'))->delete(route('compte.parents.retirer', $lien))->assertNotFound();

    $this->actingAs($this->eleve)->delete(route('compte.parents.retirer', $lien))->assertRedirect();

    expect($lien->fresh()->revoque_le)->not->toBeNull();
    $this->actingAs($this->parent)->get(route('parent.enfants.show', $this->eleve))->assertNotFound();
});

test('deux parents au plus par élève', function () {
    foreach (range(1, 2) as $_) {
        $code = codeDeLiaison($this->eleve);
        $this->actingAs(User::factory()->avecRole(Role::Parent)->create())->post(route('parent.liens.store'), ['code' => $code]);
    }

    $this->actingAs($this->eleve)->post(route('compte.parents.code'))->assertSessionHasErrors('code');
});

test('le parent paie l\'abonnement de son enfant : c\'est l\'enfant qui est abonné', function () {
    config(['paiements.passerelle' => 'simulee']);
    $code = codeDeLiaison($this->eleve);
    $this->actingAs($this->parent)->post(route('parent.liens.store'), ['code' => $code]);

    $this->actingAs($this->parent)
        ->post(route('parent.enfants.paiements.store', $this->eleve), ['formule' => 'mensuel', 'moyen' => 'mtn_momo', 'numero' => '664 12 34 56'])
        ->assertRedirect();

    $paiement = Paiement::query()->sole();
    expect($paiement->user_id)->toBe($this->parent->id)
        ->and($paiement->beneficiaire_id)->toBe($this->eleve->id);

    $this->actingAs($this->parent)->get(route('parent.paiements.show', $paiement))
        ->assertInertia(fn (Assert $page) => $page->component('parent/paiement')->where('paiement.enfant.prenom', $this->eleve->prenom));
    // Ce paiement n'est pas celui de l'élève (il ne l'a pas lancé).
    $this->actingAs($this->eleve)->get(route('eleve.paiements.show', $paiement))->assertNotFound();

    $webhook = app(PasserelleSimulee::class)->notification($paiement, true);
    envoyerWebhook($webhook['corps'])->assertOk()->assertJsonPath('resultat', 'reussi');

    expect(Abonnement::query()->where('user_id', $this->eleve->id)->sole()->paiement_id)->toBe($paiement->id)
        ->and(Abonnement::query()->where('user_id', $this->parent->id)->exists())->toBeFalse();
});

test('un parent au numéro non vérifié ne paie pas', function () {
    config(['paiements.passerelle' => 'simulee']);
    $parent = User::factory()->avecRole(Role::Parent)->numeroNonVerifie()->create();
    $code = codeDeLiaison($this->eleve);
    $this->actingAs($parent)->post(route('parent.liens.store'), ['code' => $code]);

    $this->actingAs($parent)
        ->post(route('parent.enfants.paiements.store', $this->eleve), ['formule' => 'mensuel', 'moyen' => 'orange_money', 'numero' => '622123456'])
        ->assertSessionHasErrors('numero');
});
