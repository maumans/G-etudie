<?php

use App\Enums\Role;
use App\Models\User;
use App\Services\TentativeService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

/*
 * Lot 6 : l'écran « Ma progression » et la matière filtrée sur ses notions
 * faibles, par leurs vraies routes.
 */

beforeEach(function () {
    $this->eleve = eleveAvecProfil('BEPC');
});

function repondreUneFois(User $eleve, $question, bool $juste): void
{
    $maintenant = CarbonImmutable::now();
    app(TentativeService::class)->enregistrer($eleve, (string) Str::uuid7(), $question, 1, ['option' => $juste ? 'b' : 'a'], null, 30, $maintenant, $maintenant);
}

test('« Ma progression » montre la jauge, chaque notion, la série, les badges et le défi', function () {
    $pythagore = questionDeTest(notionDeTest());
    questionDeTest(notionDeTest('La réciproque'));
    repondreUneFois($this->eleve, $pythagore, true);

    $this->actingAs($this->eleve)->get(route('eleve.progression'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('eleve/progression')
            ->where('examen', 'BEPC')
            ->where('jauge.pourcentage', 4)
            ->where('detail.matieres.0.cle', 'maths')
            ->where('detail.matieres.0.maitrise', 17)
            ->where('detail.matieres.0.notions', 2)
            ->where('detail.matieres.0.chapitres.0.notions.0.titre', 'Le théorème de Pythagore')
            ->where('detail.matieres.0.chapitres.0.notions.0.maitrise', 33)
            ->where('detail.matieres.0.chapitres.0.notions.0.etat', 'fragile')
            ->where('detail.matieres.0.chapitres.0.notions.1.etat', 'nouvelle')
            ->where('detail.resume', ['maitrisees' => 0, 'en_cours' => 1, 'a_revoir' => 0, 'nouvelles' => 1])
            ->has('badges', 12)
            ->where('points.total', 11)
            ->where('defi.cle', 'maths')
            ->where('seance.questions', 2)
            ->has('serie.cases', 14));
});

test('la matière « À travailler » ne garde que les notions commencées et pas maîtrisées', function () {
    $fragile = questionDeTest(notionDeTest('Fragile'));
    questionDeTest(notionDeTest('Jamais vue'));
    repondreUneFois($this->eleve, $fragile, false);

    $this->actingAs($this->eleve)->get(route('eleve.cours.matiere', ['matiere' => 'maths', 'faibles' => 1]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('eleve/matiere')
            ->where('faibles', true)
            ->has('chapitres', 1)
            ->has('chapitres.0.notions', 1)
            ->where('chapitres.0.notions.0.titre', 'Fragile')
            ->where('chapitres.0.notions.0.etat', 'fragile'));

    $this->actingAs($this->eleve)->get(route('eleve.cours.matiere', 'maths'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('faibles', false)
            ->has('chapitres.0.notions', 2)
            ->where('chapitres.0.notions.1.etat', 'nouvelle'));
});

test('sans exercice publié, l\'écran garde sa forme (état vide côté page)', function () {
    $this->actingAs($this->eleve)->get(route('eleve.progression'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('jauge.pourcentage', 0)
            ->where('defi', null)
            ->where('seance.questions', 0));
});

test('« Ma progression » : réservée à l\'élève ; sans profil, le parcours d\'accueil', function () {
    $this->get(route('eleve.progression'))->assertRedirect(route('login'));
    $this->actingAs(User::factory()->avecRole(Role::Relecteur)->create())->get(route('eleve.progression'))->assertForbidden();
    $this->actingAs(User::factory()->sansProfil()->create())->get(route('eleve.progression'))->assertRedirect(route('eleve.bienvenue'));
});
