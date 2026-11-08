<?php

use App\Enums\FormuleAbonnement;
use App\Enums\Role;
use App\Models\Abonnement;
use App\Models\CodeAcces;
use App\Models\EntreeJournalAcces;
use App\Models\LotCodes;
use App\Models\User;
use App\Services\CodeAccesService;
use App\Support\CodeAcces as FormatCode;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Inertia\Testing\AssertableInertia as Assert;

/*
 * Lot 9 (PLAN M16) : codes prépayés. Fabriqués à la console, imprimés puis
 * remis (le clair disparaît), utilisés une fois par un élève, essais limités.
 */

beforeEach(function () {
    $this->admin = User::factory()->avecRole(Role::Superadmin)->create();
    $this->eleve = eleveAvecProfil('BEPC');
});

/** Un lot fabriqué par l'écran de la console ; renvoie ses codes en clair. */
function lotParLaConsole(User $admin, string $formule = 'annee', int $quantite = 3): array
{
    test()->actingAs($admin)->post(route('console.codes.store'), [
        'libelle' => 'Librairie de Madina', 'formule' => $formule, 'quantite' => $quantite, 'revendeur' => 'Librairie de Madina',
    ])->assertRedirect();

    $lot = LotCodes::query()->latest('id')->firstOrFail();

    return [$lot, $lot->codes_en_attente];
}

test('la console fabrique un lot : seule l\'empreinte des codes est en base', function () {
    [$lot, $codes] = lotParLaConsole($this->admin, quantite: 5);

    expect($codes)->toHaveCount(5)
        ->and(CodeAcces::query()->where('lot_id', $lot->id)->count())->toBe(5)
        ->and(collect($codes)->every(fn (string $c) => FormatCode::normaliser($c) === $c))->toBeTrue();

    $brut = DB::table('lots_codes')->where('id', $lot->id)->value('codes_en_attente');
    $empreintes = CodeAcces::query()->pluck('empreinte');

    foreach ($codes as $code) {
        expect($brut)->not->toContain($code)
            ->and($empreintes)->toContain(FormatCode::empreinte($code))
            ->and($empreintes)->not->toContain($code);
    }

    $this->get(route('console.codes.impression', $lot))
        ->assertInertia(fn (Assert $page) => $page->component('impression/codes')->has('codes', 5)->where('codes.0', FormatCode::afficher($codes[0])));
    $fichier = $this->get(route('console.codes.fichier', $lot))->assertOk()->streamedContent();
    expect($fichier)->toContain(FormatCode::afficher($codes[4]));
});

test('une fois remis, les codes ne sont plus lisibles nulle part', function () {
    [$lot] = lotParLaConsole($this->admin);

    $this->post(route('console.codes.remis', $lot))->assertRedirect();

    expect($lot->fresh()->codes_en_attente)->toBeNull()
        ->and($lot->fresh()->codes_remis_le)->not->toBeNull();
    $this->get(route('console.codes.impression', $lot))->assertNotFound();
    $this->get(route('console.codes.fichier', $lot))->assertNotFound();
    $this->get(route('console.codes.show', $lot))->assertInertia(fn (Assert $page) => $page->where('apercu', null)->where('lot.codes_disponibles', false));
});

test('un élève utilise un code : abonnement de la formule du lot, et le code ne resert pas', function () {
    [, $codes] = lotParLaConsole($this->admin, 'annee');
    $saisie = strtolower(FormatCode::afficher($codes[0]));

    $this->actingAs($this->eleve)->post(route('eleve.abonnement.code'), ['code' => $saisie])
        ->assertRedirect(route('eleve.abonnement'))
        ->assertSessionHasNoErrors();

    $abonnement = Abonnement::query()->where('user_id', $this->eleve->id)->sole();
    expect($abonnement->formule)->toBe(FormuleAbonnement::Annee)
        ->and($abonnement->fin->toDateString())->toBe(CarbonImmutable::now()->addMonthsNoOverflow(10)->toDateString())
        ->and(CodeAcces::query()->whereNotNull('utilise_le')->sole()->utilise_par)->toBe($this->eleve->id);

    // Le même élève, puis un autre : refusés, sans second abonnement.
    $this->post(route('eleve.abonnement.code'), ['code' => $codes[0]])
        ->assertSessionHasErrors(['code' => 'Tu as déjà utilisé ce code : ton abonnement est en place.']);
    $this->actingAs(eleveAvecProfil('BEPC'))->post(route('eleve.abonnement.code'), ['code' => $codes[0]])
        ->assertSessionHasErrors(['code' => 'Ce code a déjà été utilisé.']);

    expect(Abonnement::query()->count())->toBe(1);

    // Journal : le code n'y figure jamais en entier.
    $entree = EntreeJournalAcces::query()->where('action', 'code.utilise')->sole();
    expect(json_encode($entree->details))->not->toContain($codes[0])
        ->and($entree->details['fin'])->toBe(substr($codes[0], -4));
});

test('code mal tapé, inconnu, ou d\'un lot désactivé : refusé avec une phrase claire', function () {
    [$lot, $codes] = lotParLaConsole($this->admin);
    $inconnu = FormatCode::generer();

    $this->actingAs($this->eleve)->post(route('eleve.abonnement.code'), ['code' => substr($codes[0], 0, 11).'Z'])
        ->assertSessionHasErrors('code');
    $this->post(route('eleve.abonnement.code'), ['code' => $inconnu])
        ->assertSessionHasErrors(['code' => 'Ce code n\'existe pas. Vérifie-le, ou demande à celui qui te l\'a vendu.']);

    $this->actingAs($this->admin)->post(route('console.codes.desactiver', $lot))->assertRedirect();
    $this->actingAs($this->eleve)->post(route('eleve.abonnement.code'), ['code' => $codes[1]])
        ->assertSessionHasErrors(['code' => 'Ce code n\'est plus valable. Rapporte la carte à celui qui te l\'a vendue.']);

    expect(Abonnement::query()->count())->toBe(0);
});

test('les essais de code sont limités (deviner un code ne marche pas)', function () {
    RateLimiter::clear('code|'.$this->eleve->id);

    for ($i = 0; $i < 8; $i++) {
        $this->actingAs($this->eleve)->post(route('eleve.abonnement.code'), ['code' => FormatCode::generer()])->assertSessionHasErrors('code');
    }

    $this->post(route('eleve.abonnement.code'), ['code' => FormatCode::generer()])->assertTooManyRequests();
});

test('seul l\'administrateur de la plateforme gère les codes et voit les paiements', function () {
    [$lot] = lotParLaConsole($this->admin);

    foreach ([Role::AdminContenu, Role::Redacteur, Role::Eleve] as $role) {
        $compte = User::factory()->avecRole($role)->create();
        $this->actingAs($compte)->get(route('console.codes.index'))->assertForbidden();
        $this->actingAs($compte)->get(route('console.codes.impression', $lot))->assertForbidden();
        $this->actingAs($compte)->get(route('console.paiements.index'))->assertForbidden();
    }

    $this->actingAs($this->admin)->get(route('console.codes.index'))
        ->assertInertia(fn (Assert $page) => $page->component('console/codes/index')->where('bilan.codes', 3)->has('lots.donnees', 1));
    $this->get(route('console.paiements.index'))->assertInertia(fn (Assert $page) => $page->component('console/paiements'));
});

test('les codes en clair d\'un lot jamais remis sont effacés au bout du délai', function () {
    $lot = app(CodeAccesService::class)->creerLot($this->admin, FormuleAbonnement::Mensuel, 2, 'Oublié');
    DB::table('lots_codes')->where('id', $lot->id)->update(['created_at' => now()->subDays(15)]);
    $recent = app(CodeAccesService::class)->creerLot($this->admin, FormuleAbonnement::Mensuel, 2, 'Récent');

    $this->artisan('codes:effacer-oublies')->assertSuccessful();

    expect($lot->fresh()->codes_en_attente)->toBeNull()
        ->and($recent->fresh()->codes_en_attente)->toHaveCount(2);
});

test('un lot se fabrique entre 1 et 1000 codes', function () {
    $this->actingAs($this->admin)->post(route('console.codes.store'), ['libelle' => 'Trop', 'formule' => 'mensuel', 'quantite' => 1001])
        ->assertSessionHasErrors('quantite');
    $this->post(route('console.codes.store'), ['libelle' => 'Rien', 'formule' => 'mensuel', 'quantite' => 0])
        ->assertSessionHasErrors('quantite');

    expect(LotCodes::query()->count())->toBe(0);
});
