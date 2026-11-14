<?php

use App\Enums\Role;
use App\Enums\SourceAbonnement;
use App\Models\Abonnement;
use App\Models\Etablissement;
use App\Models\Examen;
use App\Models\Groupe;
use App\Models\LicenceEtablissement;
use App\Models\RattachementEtablissement;
use App\Models\User;
use App\Services\AbonnementService;
use Database\Seeders\ReferentielSeeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;

/*
 * Lot 11 (PLAN M14, décision 3) : la console crée l'établissement, nomme son
 * gestionnaire et accorde une licence ; le gestionnaire rattache ses
 * enseignants et attribue les places aux élèves de ses groupes.
 */

afterEach(fn () => Carbon::setTestNow());

beforeEach(function () {
    $this->seed(ReferentielSeeder::class);
    $this->admin = User::factory()->avecRole(Role::Superadmin)->create();
});

/** Par la console : un établissement, son gestionnaire (compte ouvert), une licence. */
function etablissementPartenaire(User $admin, int $places = 2): array
{
    test()->actingAs($admin)->post(route('console.etablissements.store'), [
        'nom' => 'Lycée de démonstration', 'type' => 'prive', 'commune' => 'Ratoma',
    ])->assertRedirect();
    $etablissement = Etablissement::query()->latest('id')->firstOrFail();

    test()->actingAs($admin)->post(route('console.etablissements.gestionnaires.store', $etablissement), [
        'prenom' => 'Mariama', 'telephone' => '621 00 00 07',
    ])->assertRedirect(route('console.etablissements.show', $etablissement));

    $motDePasse = null;
    test()->actingAs($admin)->get(route('console.etablissements.show', $etablissement))
        ->assertInertia(function (Assert $page) use (&$motDePasse) {
            $page->component('console/etablissement')->has('rattachements', 1);
            $motDePasse = $page->toArray()['props']['mot_de_passe_provisoire']['mot_de_passe'];
        });

    test()->actingAs($admin)->post(route('console.etablissements.licences.store', $etablissement), [
        'places' => $places, 'debut' => now()->toDateString(), 'fin' => now()->addMonths(8)->toDateString(), 'reference' => 'Contrat 2026-01',
    ])->assertRedirect();

    $gestionnaire = User::query()->where('telephone', '+224621000007')->sole();

    return [$etablissement, $gestionnaire, $motDePasse, LicenceEtablissement::query()->where('etablissement_id', $etablissement->id)->sole()];
}

test('la console ouvre le compte du gestionnaire : mot de passe provisoire montré une fois, haché en base', function () {
    [$etablissement, $gestionnaire, $motDePasse] = etablissementPartenaire($this->admin);

    expect($gestionnaire->hasRole(Role::GestionnaireEtablissement))->toBeTrue()
        ->and(Hash::check($motDePasse, $gestionnaire->password))->toBeTrue()
        ->and(RattachementEtablissement::query()->where('user_id', $gestionnaire->id)->sole()->etablissement_id)->toBe($etablissement->id);

    // Une seconde visite ne le montre plus.
    $this->actingAs($this->admin)->get(route('console.etablissements.show', $etablissement))
        ->assertInertia(fn (Assert $page) => $page->where('mot_de_passe_provisoire', null));

    $this->actingAs($gestionnaire)->get(route('etablissement.accueil'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('etablissement/accueil')
            ->where('etablissement.nom', 'Lycée de démonstration')
            ->where('licences.0.places', 2)
            ->where('licences.0.prises', 0));
});

test('un numéro déjà élève ne devient pas gestionnaire', function () {
    $eleve = eleveAvecProfil('BEPC');
    $this->actingAs($this->admin)->post(route('console.etablissements.store'), ['nom' => 'École', 'type' => 'public'])->assertRedirect();
    $etablissement = Etablissement::query()->latest('id')->firstOrFail();

    $this->actingAs($this->admin)->post(route('console.etablissements.gestionnaires.store', $etablissement), [
        'prenom' => 'X', 'telephone' => $eleve->telephone,
    ])->assertSessionHasErrors('telephone');

    expect($eleve->fresh()->hasRole(Role::GestionnaireEtablissement))->toBeFalse();
});

test('le gestionnaire rattache un enseignant, qui crée un groupe de l\'établissement ; il attribue les places de la licence', function () {
    [$etablissement, $gestionnaire, , $licence] = etablissementPartenaire($this->admin, places: 1);

    $this->actingAs($gestionnaire)->post(route('etablissement.enseignants.store'), ['prenom' => 'Fatoumata', 'telephone' => '621 00 00 03'])
        ->assertRedirect(route('etablissement.accueil'));
    $enseignant = User::query()->where('telephone', '+224621000003')->sole();
    expect($enseignant->hasRole(Role::Enseignant))->toBeTrue();

    $this->actingAs($enseignant)->post(route('enseignant.groupes.store'), [
        'nom' => '10e A', 'examen' => Examen::where('code', 'BEPC')->value('id'), 'etablissement' => $etablissement->id,
    ])->assertRedirect();
    $groupe = Groupe::query()->sole();
    expect($groupe->etablissement_id)->toBe($etablissement->id);

    $eleve = eleveAvecProfil('BEPC');
    $deuxieme = eleveAvecProfil('BEPC');
    $horsEcole = eleveAvecProfil('BEPC');
    foreach ([$eleve, $deuxieme] as $membre) {
        $this->actingAs($membre)->post(route('eleve.groupes.rejoindre'), ['code' => $groupe->code])->assertRedirect();
    }

    $this->actingAs($gestionnaire)->get(route('etablissement.licences'))
        ->assertInertia(fn (Assert $page) => $page->component('etablissement/licences')->has('eleves', 2)->where('courante', $licence->id));

    $this->actingAs($gestionnaire)->post(route('etablissement.licences.attribuer', $licence), ['eleve' => $horsEcole->id])
        ->assertSessionHasErrors('eleve');
    $this->actingAs($gestionnaire)->post(route('etablissement.licences.attribuer', $licence), ['eleve' => $eleve->id])
        ->assertRedirect();
    // Plus de place.
    $this->actingAs($gestionnaire)->post(route('etablissement.licences.attribuer', $licence), ['eleve' => $deuxieme->id])
        ->assertSessionHasErrors('licence');

    $abonnement = Abonnement::query()->where('user_id', $eleve->id)->sole();
    expect($abonnement->source)->toBe(SourceAbonnement::Licence)
        ->and($abonnement->fin->toDateString())->toBe($licence->fin->toDateString())
        ->and(app(AbonnementService::class)->finAbonnement($eleve))->not->toBeNull()
        ->and(app(AbonnementService::class)->etat($eleve)['formule'])->toBe("Licence de l'établissement");

    // Reprendre la place la libère.
    $this->actingAs($gestionnaire)->delete(route('etablissement.licences.reprendre', [$licence, $eleve]))->assertRedirect();
    expect(app(AbonnementService::class)->finAbonnement($eleve))->toBeNull();
    $this->actingAs($gestionnaire)->post(route('etablissement.licences.attribuer', $licence), ['eleve' => $deuxieme->id])->assertRedirect();

    // Le rapport compte les élèves du groupe.
    $this->actingAs($gestionnaire)->get(route('etablissement.accueil'))
        ->assertInertia(fn (Assert $page) => $page->where('resume.eleves', 2)->where('groupes.0.nom', '10e A'));
    $this->actingAs($gestionnaire)->get(route('etablissement.groupes.show', $groupe))->assertOk();
});

test('un gestionnaire ne voit rien d\'un autre établissement (404)', function () {
    [$etablissement, , , $licence] = etablissementPartenaire($this->admin);
    $enseignant = User::factory()->avecRole(Role::Enseignant)->create();
    RattachementEtablissement::create(['user_id' => $enseignant->id, 'etablissement_id' => $etablissement->id, 'role' => 'enseignant', 'rattache_le' => now()]);
    $this->actingAs($enseignant)->post(route('enseignant.groupes.store'), [
        'nom' => '10e A', 'examen' => Examen::where('code', 'BEPC')->value('id'), 'etablissement' => $etablissement->id,
    ]);
    $groupe = Groupe::query()->sole();
    $eleve = eleveAvecProfil('BEPC');
    $this->actingAs($eleve)->post(route('eleve.groupes.rejoindre'), ['code' => $groupe->code]);

    $autre = User::factory()->avecRole(Role::GestionnaireEtablissement)->create();
    $sonEcole = Etablissement::create(['nom' => 'Autre école', 'type' => 'public']);
    RattachementEtablissement::create(['user_id' => $autre->id, 'etablissement_id' => $sonEcole->id, 'role' => 'gestionnaire_etablissement', 'rattache_le' => now()]);

    $this->actingAs($autre)->get(route('etablissement.groupes.show', $groupe))->assertNotFound();
    $this->actingAs($autre)->post(route('etablissement.licences.attribuer', $licence), ['eleve' => $eleve->id])->assertNotFound();
    $this->actingAs($autre)->delete(route('etablissement.enseignants.retirer', RattachementEtablissement::query()->where('user_id', $enseignant->id)->sole()))->assertNotFound();
    $this->actingAs($autre)->get(route('etablissement.accueil'))
        ->assertInertia(fn (Assert $page) => $page->where('etablissement.nom', 'Autre école')->has('groupes', 0));

    expect(Abonnement::query()->count())->toBe(0);
});

test('un enseignant ne crée pas de groupe pour un établissement où il n\'enseigne pas', function () {
    $ecole = Etablissement::create(['nom' => 'École', 'type' => 'public']);
    $enseignant = User::factory()->avecRole(Role::Enseignant)->create();

    $this->actingAs($enseignant)->post(route('enseignant.groupes.store'), [
        'nom' => 'Intrus', 'examen' => Examen::where('code', 'BEPC')->value('id'), 'etablissement' => $ecole->id,
    ])->assertRedirect();

    // L'établissement inconnu de l'enseignant est ignoré : groupe sans établissement.
    expect(Groupe::query()->sole()->etablissement_id)->toBeNull();
});

test('un gestionnaire sans établissement voit un état vide, pas une erreur', function () {
    $this->actingAs(User::factory()->avecRole(Role::GestionnaireEtablissement)->create())
        ->get(route('etablissement.accueil'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('etablissement/accueil')->where('etablissement', null));
});
