<?php

use App\Enums\Role;
use App\Models\Matiere;
use App\Models\User;
use App\Services\ContenuService;
use App\Services\SeanceService;
use App\Support\CatalogueEleve;
use Inertia\Testing\AssertableInertia as Assert;

/*
 * Ce qu'un élève voit : CatalogueEleve est la seule autorité ; une fiche hors
 * périmètre répond 404 (CLAUDE.md § 3), par l'écran comme par la règle.
 */

test('un élève du BEPC lit les leçons publiées de ses matières, en 10e année seulement', function () {
    $eleve = eleveAvecProfil('BEPC');
    $sienne = leconPubliee(notionDeTest());
    $terminale = leconPubliee(notionAilleurs('maths', 'Terminale'), 'Les suites');
    $horsExamen = leconPubliee(notionAilleurs('anglais', '10e année'), 'Present perfect');

    $profil = CatalogueEleve::profil($eleve);

    expect(CatalogueEleve::lecons($profil)->pluck('id')->all())->toBe([$sienne->id])
        ->and(CatalogueEleve::peutLireLecon($eleve, $terminale))->toBeFalse()
        ->and(CatalogueEleve::peutLireLecon($eleve, $horsExamen))->toBeFalse();

    $this->actingAs($eleve)->get(route('eleve.lecons.show', $sienne))->assertOk();
    $this->actingAs($eleve)->get(route('eleve.lecons.show', $terminale))->assertNotFound();
    $this->actingAs($eleve)->get(route('eleve.lecons.show', $horsExamen))->assertNotFound();
});

test('un brouillon jamais publié et une leçon archivée ne se lisent pas ; une publiée en retouche, si', function () {
    $eleve = eleveAvecProfil('BEPC');
    $contenu = app(ContenuService::class);
    $redacteur = User::factory()->avecRole(Role::Redacteur)->create();
    $responsable = User::factory()->avecRole(Role::AdminContenu)->create();

    $brouillon = $contenu->creerLecon($redacteur, notionDeTest('Le cosinus'), 'Le cosinus');
    $archivee = leconPubliee(notionDeTest('La réciproque'), 'La réciproque');
    $contenu->archiver($archivee, $responsable);
    $retouchee = leconPubliee(notionDeTest(), 'Pythagore');
    $contenu->ouvrirModification($retouchee, $retouchee->auteur);

    foreach ([$brouillon, $archivee->fresh()] as $lecon) {
        $this->actingAs($eleve)->get(route('eleve.lecons.show', $lecon))->assertNotFound();
    }

    $this->actingAs($eleve)->get(route('eleve.lecons.show', $retouchee))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('lecon.titre', 'Pythagore'));
});

test('une matière, une fiche ou une séance hors périmètre répondent 404', function () {
    $eleve = eleveAvecProfil('BEPC');
    $autre = eleveAvecProfil('BEPC');
    leconPubliee(notionDeTest());
    $chapitreTerminale = notionAilleurs('physique', 'Terminale')->chapitre;
    questionDeTest(notionDeTest());
    $seanceDeLAutre = app(SeanceService::class)->commencer($autre);

    $this->actingAs($eleve)->get(route('eleve.cours.matiere', 'maths'))->assertOk();
    $this->actingAs($eleve)->get(route('eleve.cours.matiere', 'anglais'))->assertNotFound();
    $this->actingAs($eleve)->get(route('eleve.chapitres.fiche', $chapitreTerminale))->assertNotFound();
    $this->actingAs($eleve)->get(route('eleve.seances.show', $seanceDeLAutre))->assertNotFound();
});

test('le personnel du back-office n\'entre pas dans l\'espace élève', function () {
    $lecon = leconPubliee(notionDeTest());
    $relecteur = User::factory()->avecRole(Role::Relecteur)->create();

    $this->actingAs($relecteur)->get(route('eleve.lecons.show', $lecon))->assertForbidden();
});

test('les matières d\'un Bac SE sont les épreuves de sa série', function () {
    $eleve = eleveAvecProfil('BAC', 'SE');
    $profil = CatalogueEleve::profil($eleve);

    $slugs = CatalogueEleve::epreuves($profil)->map(fn ($epreuve) => $epreuve->matiere->slug)->all();

    expect($slugs)->toEqualCanonicalizing(['biologie', 'chimie', 'physique', 'maths'])
        ->and(CatalogueEleve::voitMatiere($profil, Matiere::where('slug', 'philosophie')->sole()))->toBeFalse();
});

test('une question en brouillon, ou d\'une autre classe, n\'est jamais proposée', function () {
    $eleve = eleveAvecProfil('BEPC');
    $publiee = questionDeTest(notionDeTest());
    questionDeTest(notionDeTest(), 'brouillon');
    questionDeTest(notionAilleurs('maths', 'Terminale'));

    expect(CatalogueEleve::questions(CatalogueEleve::profil($eleve))->pluck('id')->all())->toBe([$publiee->id]);
});
