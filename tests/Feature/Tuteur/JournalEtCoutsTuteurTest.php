<?php

use App\Enums\Role;
use App\Models\ConversationTuteur;
use App\Models\MessageTuteur;
use App\Models\User;
use App\Services\Tuteur\MoteurTuteur;
use Inertia\Testing\AssertableInertia;
use Tests\Doubles\TuteurEnMemoire;

/*
| Lot 10 : le journal du tuteur (back-office, « pour améliorer les
| corrigés ») et son coût (console). Le journal ne dit jamais quel élève a
| demandé quoi.
*/

beforeEach(function () {
    $this->moteur = new TuteurEnMemoire;
    app()->instance(MoteurTuteur::class, $this->moteur);

    $this->eleve = eleveAvecProfil();
    $this->eleve->forceFill(['prenom' => 'Mariama', 'pseudo' => 'mariama_224'])->save();
    $this->question = questionDeTest(notionDeTest());

    $this->moteur->repondAvec('Première explication.', entree: 1000, sortie: 200);
    $this->actingAs($this->eleve)->post('/eleve/tuteur/demandes', [
        'demande' => 'expliquer',
        'question' => $this->question->uuid,
        'version' => $this->question->versionPubliee->numero,
        'reponse' => ['option' => 'a'],
    ])->streamedContent();

    $this->conversation = ConversationTuteur::sole();
    $this->reponse = MessageTuteur::query()->where('role', 'tuteur')->sole();
});

test('le journal montre les échanges et les questions les plus expliquées, sans l’élève', function () {
    $pedagogie = User::factory()->avecRole(Role::AdminContenu)->create();

    $reponse = $this->actingAs($pedagogie)->get('/contenu/tuteur');

    $reponse->assertOk()->assertInertia(fn (AssertableInertia $page) => $page->component('contenu/tuteur/index')
        ->where('bilan.explications', 1)
        ->where('bilan.conversations', 1)
        ->has('conversations.donnees', 1)
        ->where('conversations.donnees.0.uuid', $this->conversation->uuid)
        ->has('plus_expliquees', 1)
        ->where('plus_expliquees.0.uuid', $this->question->uuid)
        ->where('plus_expliquees.0.conversations', 1));

    $fiche = $this->actingAs($pedagogie)->get("/contenu/tuteur/{$this->conversation->uuid}");
    $fiche->assertOk()->assertInertia(fn (AssertableInertia $page) => $page->component('contenu/tuteur/fiche')
        ->has('conversation.messages', 2)
        ->where('conversation.question', $this->question->uuid));

    foreach ([$reponse, $fiche] as $page) {
        expect($page->getContent())->not->toContain('Mariama')
            ->not->toContain('mariama_224')
            ->not->toContain($this->eleve->telephone);
    }
});

test('une réponse signalée passe en tête, puis se classe', function () {
    $this->moteur->repondAvec('Seconde explication.');
    $autre = eleveAvecProfil();
    $this->actingAs($autre)->post('/eleve/tuteur/demandes', [
        'demande' => 'question', 'matiere' => 'maths', 'texte' => 'Pythagore ?',
    ])->streamedContent();

    $this->actingAs($this->eleve)->post("/eleve/tuteur/reponses/{$this->reponse->uuid}/signaler", ['motif' => 'fausse'])->assertNoContent();

    $pedagogie = User::factory()->avecRole(Role::AdminContenu)->create();
    $this->actingAs($pedagogie)->get('/contenu/tuteur')
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('bilan.signalements', 1)
            ->where('conversations.donnees.0.uuid', $this->conversation->uuid)
            ->where('conversations.donnees.0.signalee', true)
            ->where('conversations.donnees.1.signalee', false));

    $this->actingAs($pedagogie)->get('/contenu/tuteur?signalees=1')
        ->assertInertia(fn (AssertableInertia $page) => $page->has('conversations.donnees', 1));

    $this->actingAs($pedagogie)->post("/contenu/tuteur/reponses/{$this->reponse->uuid}/classer")->assertRedirect();

    expect($this->reponse->fresh()->signalement_classe_le)->not->toBeNull();
    $this->actingAs($pedagogie)->get('/contenu/tuteur')
        ->assertInertia(fn (AssertableInertia $page) => $page->where('bilan.signalements', 0));

    // Une réponse jamais signalée ne se classe pas.
    $autreReponse = MessageTuteur::query()->where('user_id', $autre->id)->where('role', 'tuteur')->sole();
    $this->actingAs($pedagogie)->post("/contenu/tuteur/reponses/{$autreReponse->uuid}/classer")->assertNotFound();
});

test('le journal est réservé au responsable pédagogique et à l’administrateur', function () {
    foreach ([Role::Redacteur, Role::Relecteur] as $role) {
        $this->actingAs(User::factory()->avecRole($role)->create())->get('/contenu/tuteur')->assertForbidden();
    }

    $this->actingAs($this->eleve)->get('/contenu/tuteur')->assertForbidden();
    $this->actingAs(User::factory()->avecRole(Role::Superadmin)->create())->get('/contenu/tuteur')->assertOk();
});

test('la console suit l’usage et le coût, jour par jour et par modèle', function () {
    $sekou = User::factory()->avecRole(Role::Superadmin)->create();

    $this->actingAs($sekou)->get('/console/tuteur')
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page->component('console/tuteur')
            ->where('bilan.explications', 1)
            ->where('bilan.aujourdhui', 1)
            ->where('bilan.eleves', 1)
            // Sonnet 5.5 : 1 000 × 2 + 200 × 10 = 4 000 micro-dollars.
            ->where('bilan.cout_micro_usd', 4000)
            ->where('bilan.cout_moyen_micro_usd', 4000)
            ->where('bilan.part_cache', 0)
            ->has('par_jour', 30)
            ->where('par_jour.29.explications', 1)
            ->where('par_jour.29.cout_micro_usd', 4000)
            ->where('par_modele.0.modele', 'claude-sonnet-5-5')
            ->where('par_modele.0.jetons_sortie', 200)
            ->where('reglages.quota_gratuit', 3)
            ->where('reglages.quota_abonne', 30));

    $this->actingAs(User::factory()->avecRole(Role::AdminContenu)->create())->get('/console/tuteur')->assertForbidden();
});
