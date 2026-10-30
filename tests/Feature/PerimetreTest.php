<?php

use App\Enums\Role;
use App\Models\User;
use App\Support\Perimetre;

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
