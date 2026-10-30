<?php

use App\Enums\Role;
use App\Enums\StatutContenu;
use App\Models\Lecon;
use App\Models\User;
use App\Services\ContenuService;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->notion = notionDeTest();
    $this->redacteur = User::factory()->avecRole(Role::Redacteur)->create(['pseudo' => 'ibra']);
    $this->relecteur = User::factory()->avecRole(Role::Relecteur)->create(['pseudo' => 'kadi']);
});

test('par l\'écran : créer une leçon, l\'écrire, l\'envoyer ; un autre la publie', function () {
    $this->actingAs($this->redacteur)
        ->get(route('contenu.lecons.create'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('contenu/lecons/creer')
            ->where('groupes.0.libelle', 'Mathématiques · 10e année · Géométrie du triangle')
            ->where('groupes.0.notions.0.id', $this->notion->id));

    $this->actingAs($this->redacteur)
        ->post(route('contenu.lecons.store'), ['notion_id' => $this->notion->id, 'titre' => 'Pythagore'])
        ->assertRedirect();

    $lecon = Lecon::sole();

    $this->actingAs($this->redacteur)
        ->get(route('contenu.lecons.edit', $lecon))
        ->assertInertia(fn (Assert $page) => $page
            ->component('contenu/lecons/edition')
            ->where('lecon.revision', 0)
            ->where('lecon.matiere.teinte', 'maths')
            ->where('renvoi', null));

    $this->actingAs($this->redacteur)
        ->put(route('contenu.lecons.update', $lecon), ['titre' => 'Le théorème de Pythagore', 'blocs' => blocsDeTest(), 'revision' => 0])
        ->assertRedirect(route('contenu.lecons.edit', $lecon))
        ->assertSessionHasNoErrors();

    $this->actingAs($this->redacteur)->post(route('contenu.lecons.soumettre', $lecon))->assertRedirect(route('contenu.lecons.show', $lecon));

    $this->actingAs($this->relecteur)
        ->get(route('contenu.lecons.show', $lecon))
        ->assertInertia(fn (Assert $page) => $page
            ->component('contenu/lecons/fiche')
            ->where('affichee.source', 'version')
            ->where('affichee.numero', 1)
            ->where('affichee.resume.formules', 1)
            ->where('droits.relire', true)
            ->where('droits.rediger', false));

    $this->actingAs($this->relecteur)
        ->post(route('contenu.lecons.publier', $lecon), ['commentaire' => 'Bien.'])
        ->assertSessionHasNoErrors();

    expect($lecon->fresh()->statut)->toBe(StatutContenu::Publie)
        ->and($lecon->fresh()->titre)->toBe('Le théorème de Pythagore');
});

test('l\'auteur voit sa leçon en relecture, sans le droit de la relire, et sa route refuse', function () {
    $pedagogie = User::factory()->avecRole(Role::AdminContenu)->create();
    $contenu = app(ContenuService::class);
    $lecon = $contenu->creerLecon($pedagogie, $this->notion, 'Pythagore');
    $contenu->soumettre($contenu->enregistrerBrouillon($lecon, $pedagogie, 'Pythagore', blocsDeTest(), 0), $pedagogie);

    $this->actingAs($pedagogie)
        ->get(route('contenu.lecons.show', $lecon))
        ->assertInertia(fn (Assert $page) => $page
            ->where('droits.relire', false)
            ->where('droits.auteur', true));

    $this->actingAs($pedagogie)->post(route('contenu.lecons.publier', $lecon))->assertForbidden();

    expect($lecon->fresh()->statut)->toBe(StatutContenu::EnRelecture);
});

test('la file de relecture ne montre que les leçons des autres', function () {
    $contenu = app(ContenuService::class);
    $pedagogie = User::factory()->avecRole(Role::AdminContenu)->create();

    $sienne = $contenu->creerLecon($pedagogie, $this->notion, 'La sienne');
    $contenu->soumettre($contenu->enregistrerBrouillon($sienne, $pedagogie, 'La sienne', blocsDeTest(), 0), $pedagogie);
    $autre = $contenu->creerLecon($this->redacteur, $this->notion, 'Celle du rédacteur');
    $contenu->soumettre($contenu->enregistrerBrouillon($autre, $this->redacteur, 'Celle du rédacteur', blocsDeTest(), 0), $this->redacteur);

    $this->actingAs($pedagogie)
        ->get(route('contenu.lecons.relecture'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('contenu/lecons/index')
            ->where('filtres.vue', 'a_relire')
            ->has('lecons.donnees', 1)
            ->where('lecons.donnees.0.titre', 'Celle du rédacteur')
            ->where('a_relire', 1));
});

test('un rédacteur n\'ouvre pas la file de relecture ; un relecteur ne crée pas de leçon', function () {
    $this->actingAs($this->redacteur)->get(route('contenu.lecons.relecture'))->assertForbidden();
    $this->actingAs($this->relecteur)->get(route('contenu.lecons.create'))->assertForbidden();
    $this->actingAs($this->relecteur)
        ->post(route('contenu.lecons.store'), ['notion_id' => $this->notion->id, 'titre' => 'X'])
        ->assertForbidden();

    expect(Lecon::count())->toBe(0);
});

test('l\'éditeur d\'une leçon d\'un autre rédacteur est fermé ; une fiche hors du back-office répond 404', function () {
    $lecon = app(ContenuService::class)->creerLecon($this->redacteur, $this->notion, 'Pythagore');
    $autre = User::factory()->avecRole(Role::Redacteur)->create();
    $eleve = User::factory()->create();

    $this->actingAs($autre)->get(route('contenu.lecons.edit', $lecon))->assertForbidden();
    $this->actingAs($autre)
        ->put(route('contenu.lecons.update', $lecon), ['titre' => 'Volé', 'blocs' => blocsDeTest(), 'revision' => 0])
        ->assertForbidden();
    $this->actingAs($autre)->get(route('contenu.lecons.show', $lecon))->assertOk();

    $this->actingAs($eleve)->get(route('contenu.lecons.show', $lecon))->assertForbidden();

    // La policy elle-même répond 404 à un compte hors du back-office.
    expect(Gate::forUser($eleve)->inspect('view', $lecon)->status())->toBe(404);
    expect($lecon->fresh()->titre)->toBe('Pythagore');
});

test('enregistrer avec une révision dépassée : erreur sur `revision`, rien d\'écrasé', function () {
    $lecon = app(ContenuService::class)->creerLecon($this->redacteur, $this->notion, 'Pythagore');

    $this->actingAs($this->redacteur)
        ->put(route('contenu.lecons.update', $lecon), ['titre' => 'Premier', 'blocs' => blocsDeTest(), 'revision' => 0]);
    $this->actingAs($this->redacteur)
        ->put(route('contenu.lecons.update', $lecon), ['titre' => 'Second', 'blocs' => blocsDeTest(), 'revision' => 0])
        ->assertSessionHasErrors('revision');

    expect($lecon->fresh()->titre)->toBe('Premier');
});

test('des blocs refusés par le format reviennent en erreur `blocs`', function () {
    $lecon = app(ContenuService::class)->creerLecon($this->redacteur, $this->notion, 'Pythagore');

    $this->actingAs($this->redacteur)
        ->put(route('contenu.lecons.update', $lecon), ['titre' => 'X', 'blocs' => ['type' => 'doc', 'content' => [['type' => 'image']]], 'revision' => 0])
        ->assertSessionHasErrors('blocs');
});

test('renvoyer sans commentaire : erreur ; avec : l\'auteur le lit dans l\'éditeur', function () {
    $contenu = app(ContenuService::class);
    $lecon = $contenu->creerLecon($this->redacteur, $this->notion, 'Pythagore');
    $contenu->soumettre($contenu->enregistrerBrouillon($lecon, $this->redacteur, 'Pythagore', blocsDeTest(), 0), $this->redacteur);

    $this->actingAs($this->relecteur)
        ->post(route('contenu.lecons.renvoyer', $lecon), ['commentaire' => ''])
        ->assertSessionHasErrors('commentaire');
    $this->actingAs($this->relecteur)
        ->post(route('contenu.lecons.renvoyer', $lecon), ['commentaire' => 'Ajoutez un exemple résolu.'])
        ->assertRedirect(route('contenu.lecons.relecture'));

    $this->actingAs($this->redacteur)
        ->get(route('contenu.lecons.edit', $lecon))
        ->assertInertia(fn (Assert $page) => $page
            ->where('renvoi.commentaire', 'Ajoutez un exemple résolu.')
            ->where('renvoi.par', 'kadi'));
});

test('la liste filtre par statut, matière et mots (chaque mot, n\'importe quelle colonne)', function () {
    $contenu = app(ContenuService::class);
    $contenu->creerLecon($this->redacteur, $this->notion, 'Pythagore direct');
    $contenu->creerLecon($this->redacteur, notionDeTest('Réciproque de Thalès'), 'Une autre leçon');

    $this->actingAs($this->relecteur)
        ->get(route('contenu.lecons.index', ['recherche' => 'autre thalès']))
        ->assertInertia(fn (Assert $page) => $page
            ->has('lecons.donnees', 1)
            ->where('lecons.donnees.0.titre', 'Une autre leçon')
            ->where('compteurs.brouillon', 2));

    $this->actingAs($this->relecteur)
        ->get(route('contenu.lecons.index', ['recherche' => '100%']))
        ->assertInertia(fn (Assert $page) => $page->has('lecons.donnees', 0));

    $this->actingAs($this->relecteur)
        ->get(route('contenu.lecons.index', ['statut' => 'publie']))
        ->assertInertia(fn (Assert $page) => $page->has('lecons.donnees', 0));
});

test('une leçon publiée s\'ouvre à la modification, puis l\'éditeur redirige une leçon en relecture vers sa fiche', function () {
    $contenu = app(ContenuService::class);
    $lecon = $contenu->creerLecon($this->redacteur, $this->notion, 'Pythagore');
    $lecon = $contenu->publier($contenu->soumettre($contenu->enregistrerBrouillon($lecon, $this->redacteur, 'Pythagore', blocsDeTest(), 0), $this->redacteur), $this->relecteur);

    $this->actingAs($this->redacteur)->get(route('contenu.lecons.edit', $lecon))->assertRedirect(route('contenu.lecons.show', $lecon));
    $this->actingAs($this->redacteur)->post(route('contenu.lecons.modifier', $lecon))->assertRedirect(route('contenu.lecons.edit', $lecon));

    expect($lecon->fresh()->statut)->toBe(StatutContenu::Brouillon)
        ->and($lecon->fresh()->version_publiee_id)->not->toBeNull();
});
