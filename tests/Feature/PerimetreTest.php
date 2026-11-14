<?php

use App\Enums\Role;
use App\Models\Classe;
use App\Models\Etablissement;
use App\Models\Examen;
use App\Models\Groupe;
use App\Models\LienParent;
use App\Models\MembreGroupe;
use App\Models\RattachementEtablissement;
use App\Models\User;
use App\Support\Perimetre;
use Database\Seeders\ReferentielSeeder;
use Illuminate\Support\Str;

test('un élève ne consulte que lui-même', function () {
    $eleve = User::factory()->create();
    $autre = User::factory()->create();

    expect(Perimetre::elevesConsultables($eleve)->pluck('id')->all())->toBe([$eleve->id])
        ->and(Perimetre::peutConsulterEleve($eleve, $autre))->toBeFalse()
        ->and(Perimetre::peutAgirSurEleve($eleve, $eleve))->toBeTrue()
        ->and(Perimetre::peutAgirSurEleve($eleve, $autre))->toBeFalse();
});

test('l\'administrateur plateforme consulte tous les élèves, sans agir sur aucun', function () {
    $admin = User::factory()->avecRole(Role::Superadmin)->create();
    $eleves = User::factory()->count(2)->create();
    User::factory()->avecRole(Role::Redacteur)->create();

    expect(Perimetre::elevesConsultables($admin)->pluck('id')->sort()->values()->all())
        ->toBe($eleves->pluck('id')->sort()->values()->all())
        ->and(Perimetre::peutAgirSurEleve($admin, $eleves[0]))->toBeFalse();
});

test('sans rattachement (lot 11), parent, enseignant et rédacteur ne voient aucun élève', function (Role $role) {
    $acteur = User::factory()->avecRole($role)->create();
    $eleve = User::factory()->create();

    expect(Perimetre::elevesConsultables($acteur)->exists())->toBeFalse()
        ->and(Perimetre::peutConsulterEleve($acteur, $eleve))->toBeFalse();
})->with([Role::Parent, Role::Enseignant, Role::Redacteur, Role::GestionnaireEtablissement]);

// Lot 11 : liens parent, groupes, établissements.

test('un parent consulte ses enfants (lien actif) et personne d\'autre', function () {
    $parent = User::factory()->avecRole(Role::Parent)->create();
    $enfant = User::factory()->create();
    $autre = User::factory()->create();
    $lien = LienParent::create(['parent_id' => $parent->id, 'eleve_id' => $enfant->id, 'lie_le' => now()]);

    expect(Perimetre::elevesConsultables($parent)->pluck('id')->all())->toBe([$enfant->id])
        ->and(Perimetre::estParentDe($parent, $enfant))->toBeTrue()
        ->and(Perimetre::peutConsulterEleve($parent, $autre))->toBeFalse();

    $lien->update(['revoque_le' => now()]);

    expect(Perimetre::elevesConsultables($parent)->exists())->toBeFalse()
        ->and(Perimetre::estParentDe($parent, $enfant))->toBeFalse();
});

test('enseignant, gestionnaire et élève : chacun ses groupes ; un élève ne voit jamais ses camarades', function () {
    $this->seed(ReferentielSeeder::class);
    $ecole = Etablissement::create(['nom' => 'École', 'type' => 'public']);
    $enseignant = User::factory()->avecRole(Role::Enseignant)->create();
    $collegue = User::factory()->avecRole(Role::Enseignant)->create();
    $gestionnaire = User::factory()->avecRole(Role::GestionnaireEtablissement)->create();
    RattachementEtablissement::create(['user_id' => $gestionnaire->id, 'etablissement_id' => $ecole->id, 'role' => 'gestionnaire_etablissement', 'rattache_le' => now()]);
    $examen = Examen::where('code', 'BEPC')->sole();
    $groupe = fn (User $prof, ?int $ecoleId) => Groupe::create([
        'enseignant_id' => $prof->id, 'etablissement_id' => $ecoleId, 'examen_id' => $examen->id, 'filiere' => 'generale',
        'classe_id' => Classe::where('examen_id', $examen->id)->value('id'), 'nom' => 'G', 'code' => strtoupper(Str::random(6)),
    ]);
    $sien = $groupe($enseignant, $ecole->id);
    $autre = $groupe($collegue, null);
    [$a, $b, $c] = User::factory()->count(3)->create()->all();
    foreach ([[$sien, $a], [$sien, $b], [$autre, $c]] as [$g, $e]) {
        MembreGroupe::create(['groupe_id' => $g->id, 'eleve_id' => $e->id, 'rejoint_le' => now()]);
    }

    expect(Perimetre::groupesConsultables($enseignant)->pluck('id')->all())->toBe([$sien->id])
        ->and(Perimetre::elevesConsultables($enseignant)->pluck('id')->sort()->values()->all())->toBe([$a->id, $b->id])
        ->and(Perimetre::peutGererGroupe($enseignant, $autre))->toBeFalse()
        ->and(Perimetre::groupesConsultables($gestionnaire)->pluck('id')->all())->toBe([$sien->id])
        ->and(Perimetre::peutGererGroupe($gestionnaire, $sien))->toBeFalse()
        ->and(Perimetre::groupesConsultables($a)->pluck('id')->all())->toBe([$sien->id])
        // L'élève ne consulte que lui-même, pas ses camarades de groupe.
        ->and(Perimetre::elevesConsultables($a)->pluck('id')->all())->toBe([$a->id]);
});
