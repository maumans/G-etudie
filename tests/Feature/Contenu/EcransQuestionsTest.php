<?php

use App\Enums\Role;
use App\Enums\StatutContenu;
use App\Enums\TypeQuestion;
use App\Models\Lecon;
use App\Models\Question;
use App\Models\User;
use App\Services\ContenuService;
use Inertia\Testing\AssertableInertia as Assert;

/*
 * Le back-office des questions, par ses écrans réels (CLAUDE.md § 4 : un
 * test passe par la porte d'entrée) : création, saisie, envoi, relecture,
 * publication ; et la mini-question d'une leçon.
 */

beforeEach(function () {
    $this->notion = notionDeTest();
    $this->redacteur = User::factory()->avecRole(Role::Redacteur)->create(['pseudo' => 'ibra']);
    $this->relecteur = User::factory()->avecRole(Role::Relecteur)->create(['pseudo' => 'kadi']);
});

/** Ce que l'écran de saisie envoie : un texte à trous, espaces compris. */
function saisieTrous(int $revision): array
{
    return [
        'enonce' => blocsDeTest('Complète :'),
        'donnees' => ['segments' => [['texte' => 'Le côté '], ['trou' => 't1'], ['texte' => ' est le plus long.']]],
        'attendue' => ['trous' => ['t1' => ['hypoténuse']]],
        'indices' => [blocsDeTest('Il est opposé à l\'angle droit.')],
        'corrige' => [['titre' => '', 'blocs' => blocsDeTest('C\'est l\'hypoténuse.')]],
        'difficulte' => 1,
        'revision' => $revision,
    ];
}

test('par l\'écran : créer une question, la saisir, l\'envoyer ; un autre la publie', function () {
    $this->actingAs($this->redacteur)
        ->get(route('contenu.questions.create'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('contenu/questions/creer')
            ->where('groupes.0.notions.0.id', $this->notion->id)
            ->has('types', 9));

    $this->actingAs($this->redacteur)
        ->post(route('contenu.questions.store'), ['notion_id' => $this->notion->id, 'type' => 'trous'])
        ->assertRedirect();

    $question = Question::sole();
    expect($question->type)->toBe(TypeQuestion::Trous)
        ->and($question->auteur_id)->toBe($this->redacteur->id);

    $this->actingAs($this->redacteur)
        ->get(route('contenu.questions.edit', $question))
        ->assertInertia(fn (Assert $page) => $page
            ->component('contenu/questions/edition')
            ->where('question.type', 'trous')
            ->where('question.revision', 0)
            ->where('a_completer', 'Une question sans énoncé ne part pas en relecture.'));

    $this->actingAs($this->redacteur)
        ->put(route('contenu.questions.update', $question), saisieTrous(0))
        ->assertRedirect(route('contenu.questions.edit', $question))
        ->assertSessionHasNoErrors();

    // Les espaces autour des trous sont gardés tels quels (relu en base).
    expect($question->fresh()->donnees['segments'][0]['texte'])->toBe('Le côté ')
        ->and($question->fresh()->extrait)->toStartWith('Complète :');

    $this->actingAs($this->redacteur)
        ->get(route('contenu.questions.edit', $question))
        ->assertInertia(fn (Assert $page) => $page->where('a_completer', null));

    $this->actingAs($this->redacteur)->post(route('contenu.questions.soumettre', $question))
        ->assertRedirect(route('contenu.questions.show', $question));

    $this->actingAs($this->relecteur)
        ->get(route('contenu.questions.relecture'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('contenu/questions/index')
            ->where('filtres.vue', 'a_relire')
            ->where('questions.donnees.0.uuid', $question->uuid)
            ->where('a_relire', 1));

    $this->actingAs($this->relecteur)
        ->get(route('contenu.questions.show', $question))
        ->assertInertia(fn (Assert $page) => $page
            ->component('contenu/questions/fiche')
            ->where('affichee.source', 'version')
            ->where('affichee.numero', 1)
            ->where('affichee.question.type', 'trous')
            ->where('affichee.question.indices', fn ($indices) => count($indices) === 1)
            ->where('droits.relire', true)
            ->where('droits.rediger', false));

    $this->actingAs($this->relecteur)
        ->post(route('contenu.questions.publier', $question), ['commentaire' => 'Juste.'])
        ->assertSessionHasNoErrors();

    expect($question->fresh()->statut)->toBe(StatutContenu::Publie);
});

test('une proposition faite d\'une seule formule garde son texte vide', function () {
    $question = app(ContenuService::class)->creerQuestion($this->redacteur, $this->notion, TypeQuestion::QcmUne);

    $this->actingAs($this->redacteur)->put(route('contenu.questions.update', $question), [
        'enonce' => blocsDeTest('Solution ?'),
        'donnees' => ['options' => [['id' => 'a', 'texte' => '', 'latex' => 'x = 2'], ['id' => 'b', 'texte' => '', 'latex' => 'x = 8']]],
        'attendue' => ['option' => 'b'],
        'indices' => [],
        'corrige' => [['titre' => '', 'blocs' => blocsDeTest('2x = 16.')]],
        'difficulte' => 2,
        'revision' => 0,
    ])->assertSessionHasNoErrors();

    expect($question->fresh()->donnees['options'][0]['texte'])->toBe('')
        ->and($question->fresh()->erreurAvantRelecture())->toBeNull();
});

test('la liste filtre par type et cherche dans l\'énoncé, côté serveur', function () {
    questionDeTest($this->notion);
    questionPubliee($this->notion, TypeQuestion::VraiFaux, [], ['valeur' => true]);

    $this->actingAs($this->relecteur)
        ->get(route('contenu.questions.index', ['type' => 'vrai_faux']))
        ->assertInertia(fn (Assert $page) => $page
            ->where('questions.total', 1)
            ->where('questions.donnees.0.type', 'vrai_faux')
            ->where('compteurs.publie', 2));

    $this->actingAs($this->relecteur)
        ->get(route('contenu.questions.index', ['recherche' => 'hypoténuse']))
        ->assertInertia(fn (Assert $page) => $page->where('questions.total', 2));

    $this->actingAs($this->relecteur)
        ->get(route('contenu.questions.index', ['recherche' => 'introuvable']))
        ->assertInertia(fn (Assert $page) => $page->where('questions.total', 0));
});

test('un rédacteur ne modifie pas la question d\'un autre ; un élève n\'entre pas', function () {
    $question = questionPubliee($this->notion, TypeQuestion::QcmUne, ['options' => [['id' => 'a', 'texte' => '1'], ['id' => 'b', 'texte' => '2']]], ['option' => 'a'], statut: 'brouillon');
    $autre = User::factory()->avecRole(Role::Redacteur)->create();

    $this->actingAs($autre)->get(route('contenu.questions.edit', $question))->assertForbidden();
    $this->actingAs($autre)->put(route('contenu.questions.update', $question), saisieTrous(0))->assertForbidden();
    $this->actingAs($autre)->get(route('contenu.questions.show', $question))->assertOk();

    $eleve = eleveAvecProfil();
    $this->actingAs($eleve)->get(route('contenu.questions.index'))->assertForbidden();
    $this->actingAs($eleve)->get(route('contenu.questions.show', $question))->assertForbidden();
});

test('mini-question : proposée dans l\'éditeur, refusée si inconnue, livrée à l\'élève publiée seulement', function () {
    $question = questionDeTest($this->notion);
    $brouillon = questionPubliee($this->notion, TypeQuestion::VraiFaux, [], ['valeur' => true], statut: 'brouillon');
    $lecon = leconPubliee($this->notion);
    $auteur = $lecon->auteur;
    $contenu = app(ContenuService::class);
    $lecon = $contenu->ouvrirModification($lecon, $auteur);

    $this->actingAs($auteur)
        ->get(route('contenu.lecons.edit', $lecon))
        ->assertInertia(fn (Assert $page) => $page
            ->where('questions_disponibles', fn ($liste) => collect($liste)->pluck('uuid')->all() === [$question->uuid]));

    $blocs = blocsDeTest();
    $blocs['content'][] = ['type' => 'question', 'attrs' => ['uuid' => (string) Str::uuid7()]];
    $this->actingAs($auteur)
        ->put(route('contenu.lecons.update', $lecon), ['titre' => 'Pythagore', 'blocs' => $blocs, 'revision' => $lecon->revision])
        ->assertSessionHasErrors(['blocs' => 'Une mini-question renvoie à une question qui n\'existe pas.']);

    $blocs['content'][2] = ['type' => 'question', 'attrs' => ['uuid' => $question->uuid]];
    $blocs['content'][] = ['type' => 'question', 'attrs' => ['uuid' => $brouillon->uuid]];
    $lecon = $contenu->enregistrerBrouillon($lecon, $auteur, 'Pythagore', $blocs, $lecon->revision);
    $contenu->publier($contenu->soumettre($lecon, $auteur), $this->relecteur);

    $eleve = eleveAvecProfil();
    $this->actingAs($eleve)
        ->get(route('eleve.lecons.show', Lecon::sole()))
        ->assertInertia(fn (Assert $page) => $page
            ->where('lecon.questions', fn ($questions) => collect($questions)->keys()->all() === [$question->uuid])
            ->where("lecon.questions.{$question->uuid}.version", 1)
            ->where("lecon.questions.{$question->uuid}.attendue", ['option' => 'b']));
});

test('un texte de leçon garde ses espaces à l\'enregistrement (gras collé au mot d\'avant)', function () {
    $lecon = app(ContenuService::class)->creerLecon($this->redacteur, $this->notion, 'Pythagore');
    $blocs = ['type' => 'doc', 'content' => [['type' => 'paragraph', 'content' => [
        ['type' => 'text', 'text' => 'Dans un triangle '],
        ['type' => 'text', 'text' => 'rectangle', 'marks' => [['type' => 'bold']]],
    ]]]];

    $this->actingAs($this->redacteur)
        ->put(route('contenu.lecons.update', $lecon), ['titre' => 'Pythagore', 'blocs' => $blocs, 'revision' => 0])
        ->assertSessionHasNoErrors();

    expect($lecon->fresh()->brouillon['content'][0]['content'][0]['text'])->toBe('Dans un triangle ');
});
