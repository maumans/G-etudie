<?php

use App\Enums\Role;
use App\Enums\StatutReponseTuteur;
use App\Models\ConversationTuteur;
use App\Models\Examen;
use App\Models\ExplicationTuteur;
use App\Models\Matiere;
use App\Models\MessageTuteur;
use App\Models\Question;
use App\Models\User;
use App\Services\Tuteur\Consignes;
use App\Services\Tuteur\MoteurTuteur;
use App\Services\Tuteur\TuteurService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Testing\TestResponse;
use Inertia\Testing\AssertableInertia;
use Tests\Doubles\TuteurEnMemoire;

/*
| Lot 10 (PLAN M11) : le tuteur N'karamögö. Critère : « une explication en
| flux » et « un refus propre hors sujet ». Le moteur est un double qui
| garde ce qui serait parti vers l'API : on vérifie aussi que rien de
| personnel n'y figure.
*/

function moteurDeTest(): TuteurEnMemoire
{
    $moteur = new TuteurEnMemoire;
    app()->instance(MoteurTuteur::class, $moteur);

    return $moteur;
}

/**
 * Les événements d'une réponse en flux (SSE), dans l'ordre.
 *
 * @return list<array{0: string, 1: array<string, mixed>}>
 */
function evenementsTuteur(TestResponse $reponse): array
{
    preg_match_all('/event: (\w+)\ndata: (.*)\n\n/', $reponse->streamedContent(), $m, PREG_SET_ORDER);

    return array_map(fn (array $e) => [$e[1], json_decode($e[2], true)], $m);
}

/** Le texte que l'élève a vu s'écrire. */
function texteVu(array $evenements): string
{
    $refus = collect($evenements)->firstWhere(0, 'refus');

    return $refus !== null
        ? $refus[1]['texte']
        : collect($evenements)->where(0, 'texte')->map(fn ($e) => $e[1]['t'])->implode('');
}

/** « Explique-moi » sous une question, comme l'envoie le panneau. */
function expliquer(User $eleve, Question $question, array $champs = []): TestResponse
{
    return test()->actingAs($eleve)->post('/eleve/tuteur/demandes', [
        'demande' => 'expliquer',
        'question' => $question->uuid,
        'version' => $question->versionPubliee->numero,
        'reponse' => ['option' => 'a'],
        ...$champs,
    ]);
}

beforeEach(function () {
    $this->moteur = moteurDeTest();
    $this->eleve = eleveAvecProfil();
    $this->question = questionDeTest(notionDeTest());
});

test('« Explique-moi » : la réponse arrive en flux, puis se garde avec ses jetons et son coût', function () {
    $this->moteur->repondAvec('Reprenons : $3^2 + 4^2 = 25$, donc l’hypoténuse mesure 5 cm.', entree: 1500, sortie: 400, cacheLus: 1000);

    $reponse = expliquer($this->eleve, $this->question);

    $reponse->assertOk();
    expect($reponse->headers->get('Content-Type'))->toStartWith('text/event-stream')
        ->and($reponse->headers->get('X-Accel-Buffering'))->toBe('no');

    $evenements = evenementsTuteur($reponse);
    expect(array_column($evenements, 0))->toContain('debut', 'texte', 'fin')
        ->and($evenements[0][0])->toBe('debut')
        ->and(end($evenements)[0])->toBe('fin')
        ->and(count(array_filter($evenements, fn ($e) => $e[0] === 'texte')))->toBeGreaterThan(1)
        ->and(texteVu($evenements))->toBe('Reprenons : $3^2 + 4^2 = 25$, donc l’hypoténuse mesure 5 cm.')
        ->and(end($evenements)[1])->toMatchArray(['statut' => 'complete', 'quota_restant' => 2, 'depuis_cache' => false]);

    $conversation = ConversationTuteur::sole();
    expect($conversation->user_id)->toBe($this->eleve->id)
        ->and($conversation->question_id)->toBe($this->question->id)
        ->and($conversation->version)->toBe($this->question->versionPubliee->numero)
        ->and($conversation->reponse)->toBe(['option' => 'a'])
        ->and($conversation->titre)->toContain('hypoténuse');

    $message = MessageTuteur::query()->where('role', 'tuteur')->sole();
    // Sonnet 5.5 : 1 500 × 2 + 400 × 10 + 1 000 × 0,10 = 7 100 micro-dollars.
    expect($message->statut)->toBe(StatutReponseTuteur::Complete)
        ->and($message->compte)->toBeTrue()
        ->and($message->modele)->toBe('claude-sonnet-5-5')
        ->and($message->jetons_entree)->toBe(1500)
        ->and($message->jetons_sortie)->toBe(400)
        ->and($message->jetons_cache_lus)->toBe(1000)
        ->and($message->cout_micro_usd)->toBe(7100)
        ->and($message->premier_mot_ms)->not->toBeNull()
        ->and($message->texte)->toContain('hypoténuse mesure 5 cm');
});

test('le tuteur lit la question, la réponse de l’élève et le corrigé validé — et rien de personnel', function () {
    $this->eleve->forceFill(['prenom' => 'Mariama', 'pseudo' => 'mariama_224'])->save();

    expliquer($this->eleve, $this->question)->streamedContent();

    $requete = $this->moteur->requetes[0];
    expect($requete->contexte)
        ->toContain('Combien mesure l\'hypoténuse ?')
        ->toContain('$$a^2 + b^2 = c^2$$')
        ->toContain('Réponse attendue : 5 cm')
        ->toContain('Réponse de l’élève : 4 cm')
        ->toContain('Corrigé validé par nos enseignants')
        ->toContain('3² + 4² = 25.')
        ->toContain('Examen : Brevet')
        ->toContain('Le théorème de Pythagore')
        ->and($requete->systeme)->toBe(Consignes::SYSTEME)
        ->and($requete->utilisateur)->toMatch('/^[0-9a-f]{32}$/');

    $toutCeQuiPart = $requete->systeme.$requete->contexte.json_encode($requete->messages);
    expect($toutCeQuiPart)->not->toContain('Mariama')
        ->not->toContain('mariama_224')
        ->not->toContain($this->eleve->telephone)
        ->not->toContain((string) $this->eleve->id.'|');
});

test('une étape du corrigé : le tuteur sait laquelle expliquer', function () {
    $reponse = expliquer($this->eleve, $this->question, ['demande' => 'etape', 'etape' => 0]);
    $reponse->streamedContent();

    expect($this->moteur->requetes[0]->contexte)->toContain('L’élève bloque sur l’étape 1 du corrigé')
        ->and(ConversationTuteur::sole()->etape)->toBe(0)
        ->and(ConversationTuteur::sole()->titre)->toStartWith('Étape 1 : Calculer');

    expliquer($this->eleve, $this->question, ['demande' => 'etape', 'etape' => 4])
        ->assertStatus(422)
        ->assertJson(['raison' => 'etape_inconnue']);
});

test('quota : trois explications par jour sans abonnement, trente avec', function () {
    foreach (range(1, 3) as $rang) {
        $evenements = evenementsTuteur(expliquer($this->eleve, $this->question, ['reponse' => ['option' => 'c'], 'texte' => null]));
        expect(end($evenements)[1]['quota_restant'])->toBe(3 - $rang);
        // Même réponse : la deuxième et la troisième viennent du cache, et comptent aussi.
    }

    expliquer($this->eleve, $this->question)
        ->assertStatus(429)
        ->assertJson(['raison' => 'quota'])
        ->assertJsonPath('message', fn (string $m) => str_contains($m, '3 explications gratuites') && str_contains($m, '30 par jour'));

    abonner($this->eleve);

    expect(app(TuteurService::class)->quota($this->eleve))
        ->toMatchArray(['limite' => 30, 'utilises' => 3, 'restants' => 27, 'abonne' => true]);
    expliquer($this->eleve, $this->question)->assertOk();
});

test('le quota repart chaque jour', function () {
    $this->travelTo(now()->setTime(22, 0));
    expliquer($this->eleve, $this->question)->streamedContent();
    expliquer($this->eleve, $this->question, ['reponse' => ['option' => 'b']])->streamedContent();
    expliquer($this->eleve, $this->question, ['reponse' => ['option' => 'c']])->streamedContent();
    expliquer($this->eleve, $this->question)->assertStatus(429);

    $this->travelTo(now()->addDay()->setTime(7, 0));

    expect(app(TuteurService::class)->quota($this->eleve)['restants'])->toBe(3);
});

test('hors sujet : un recentrage écrit par nous, le marqueur jamais vu, rien de décompté', function () {
    $this->moteur->repondAvec(Consignes::HORS_SUJET.' Parlons de tes maths plutôt.');

    $evenements = evenementsTuteur($this->actingAs($this->eleve)->post('/eleve/tuteur/demandes', [
        'demande' => 'question',
        'matiere' => 'maths',
        'texte' => 'Qui va gagner le match de football ce soir ?',
    ]));

    $refus = collect($evenements)->firstWhere(0, 'refus');
    expect($refus[1])->toBe(['texte' => TuteurService::RECENTRAGE, 'statut' => 'hors_sujet'])
        ->and(collect($evenements)->where(0, 'texte')->isEmpty())->toBeTrue()
        ->and($this->moteur->requetes)->toHaveCount(1)
        ->and(json_encode($evenements))->not->toContain('HORS_SUJET');

    $message = MessageTuteur::query()->where('role', 'tuteur')->sole();
    expect($message->statut)->toBe(StatutReponseTuteur::HorsSujet)
        ->and($message->compte)->toBeFalse()
        ->and($message->texte)->toBe(TuteurService::RECENTRAGE)
        ->and(app(TuteurService::class)->quota($this->eleve)['restants'])->toBe(3);
});

test('contenu inadapté, ou refus du modèle : un refus calme, rien de décompté', function () {
    $this->moteur->repondAvec(Consignes::INADAPTE);
    $this->moteur->repondAvec('Je ne', fin: 'refus');

    foreach ([1, 2] as $rang) {
        $evenements = evenementsTuteur($this->actingAs($this->eleve)->post('/eleve/tuteur/demandes', [
            'demande' => 'question', 'matiere' => 'maths', 'texte' => "Demande déplacée n° {$rang}",
        ]));

        expect(collect($evenements)->firstWhere(0, 'refus')[1])->toBe(['texte' => TuteurService::REFUS, 'statut' => 'refus'])
            ->and(end($evenements)[1]['statut'])->toBe('refus');
    }

    expect(MessageTuteur::query()->where('role', 'tuteur')->where('compte', true)->count())->toBe(0);
});

test('un crochet ordinaire en début de réponse n’est pas pris pour un marqueur', function () {
    $this->moteur->repondAvec('[Rappel] Dans un triangle rectangle, $c^2 = a^2 + b^2$.');

    $evenements = evenementsTuteur(expliquer($this->eleve, $this->question));

    expect(texteVu($evenements))->toBe('[Rappel] Dans un triangle rectangle, $c^2 = a^2 + b^2$.')
        ->and(end($evenements)[1]['statut'])->toBe('complete');
});

test('cache : la même question, avec la même réponse, est servie sans nouvel appel ni coût', function () {
    $this->moteur->repondAvec('Première explication, écrite par l’API.');
    expliquer($this->eleve, $this->question)->streamedContent();

    $autre = eleveAvecProfil();
    $evenements = evenementsTuteur(expliquer($autre, $this->question));

    expect($this->moteur->requetes)->toHaveCount(1)
        ->and(texteVu($evenements))->toBe('Première explication, écrite par l’API.')
        ->and(end($evenements)[1]['depuis_cache'])->toBeTrue()
        ->and(ExplicationTuteur::sole()->servie)->toBe(1);

    $servi = MessageTuteur::query()->where('user_id', $autre->id)->where('role', 'tuteur')->sole();
    expect($servi->depuis_cache)->toBeTrue()
        ->and($servi->cout_micro_usd)->toBe(0)
        ->and($servi->compte)->toBeTrue();

    // Une autre réponse de l'élève : une autre explication.
    expliquer($autre, $this->question, ['reponse' => ['option' => 'c']])->streamedContent();
    expect($this->moteur->requetes)->toHaveCount(2);
});

test('relances : la conversation suit, puis se ferme après cinq relances', function () {
    $this->moteur->repondAvec('Explication 1.');
    expliquer($this->eleve, $this->question)->streamedContent();
    $conversation = ConversationTuteur::sole();

    $this->moteur->repondAvec('Explication plus simple.');
    $evenements = evenementsTuteur($this->actingAs($this->eleve)->post('/eleve/tuteur/demandes', [
        'conversation' => $conversation->uuid, 'demande' => 'plus_simple',
    ]));

    expect(texteVu($evenements))->toBe('Explication plus simple.')
        ->and(end($evenements)[1]['relances_restantes'])->toBe(4)
        ->and($this->moteur->requetes[1]->messages)->toBe([
            ['role' => 'user', 'content' => 'Explique-moi cette question.'],
            ['role' => 'assistant', 'content' => 'Explication 1.'],
            ['role' => 'user', 'content' => 'Encore plus simple, s’il te plaît.'],
        ])
        ->and($this->moteur->requetes[1]->contexte)->toContain('Réponse de l’élève : 4 cm');

    abonner($this->eleve);

    foreach (range(1, 4) as $rang) {
        $this->actingAs($this->eleve)->post('/eleve/tuteur/demandes', [
            'conversation' => $conversation->uuid, 'demande' => 'question', 'texte' => "Et pourquoi au carré ? ({$rang})",
        ])->streamedContent();
    }

    $this->actingAs($this->eleve)->post('/eleve/tuteur/demandes', [
        'conversation' => $conversation->uuid, 'demande' => 'exemple',
    ])->assertStatus(422)->assertJson(['raison' => 'conversation_finie']);
});

test('ce que tape l’élève est nettoyé : ni numéro ni adresse ne partent', function () {
    $this->actingAs($this->eleve)->post('/eleve/tuteur/demandes', [
        'demande' => 'question',
        'matiere' => 'maths',
        'texte' => 'Appelle-moi au +224 620 12 34 56 ou écris à aissatou@exemple.gn pour Pythagore',
    ])->streamedContent();

    $parti = $this->moteur->requetes[0]->derniereDemande();
    $garde = MessageTuteur::query()->where('role', 'eleve')->sole()->texte;

    foreach ([$parti, $garde] as $texte) {
        expect($texte)->not->toContain('620')->not->toContain('aissatou@')->toContain('[retiré]')->toContain('Pythagore');
    }

    expect($this->moteur->requetes[0]->contexte)->toContain('Matière : Mathématiques')->toContain('Géométrie du triangle');
});

test('une panne de l’API : un message, rien de décompté, le verrou relâché', function () {
    $this->moteur->tombeEnPanne();

    $evenements = evenementsTuteur(expliquer($this->eleve, $this->question));

    expect(array_column($evenements, 0))->toBe(['debut', 'erreur'])
        ->and($evenements[1][1]['message'])->toContain('ne répond pas');

    $message = MessageTuteur::query()->where('role', 'tuteur')->sole();
    expect($message->statut)->toBe(StatutReponseTuteur::Erreur)->and($message->compte)->toBeFalse();

    expliquer($this->eleve, $this->question)->assertOk();
});

test('une explication à la fois : la seconde attend la première', function () {
    $verrou = Cache::lock('tuteur|'.$this->eleve->id, 60);
    $verrou->get();

    expliquer($this->eleve, $this->question)->assertStatus(409)->assertJson(['raison' => 'en_cours']);

    $verrou->release();
    expliquer($this->eleve, $this->question)->assertOk();
});

test('hors du périmètre de l’élève : 404, jamais 403', function () {
    $ailleurs = questionDeTest(notionAilleurs('philosophie', 'Terminale', 'Le doute'));
    expliquer($this->eleve, $ailleurs)->assertNotFound();

    // Une version jamais publiée.
    expliquer($this->eleve, $this->question, ['version' => 99])->assertNotFound();

    // Une matière qui n'est pas la sienne.
    $this->actingAs($this->eleve)->post('/eleve/tuteur/demandes', [
        'demande' => 'question', 'matiere' => 'philosophie', 'texte' => 'Qu’est-ce que le doute ?',
    ])->assertNotFound();

    // La conversation d'un autre élève : ni lue, ni prolongée, ni signalée.
    expliquer($this->eleve, $this->question)->streamedContent();
    $conversation = ConversationTuteur::sole();
    $reponse = MessageTuteur::query()->where('role', 'tuteur')->sole();
    $autre = eleveAvecProfil();

    $this->actingAs($autre)->get("/eleve/tuteur/{$conversation->uuid}")->assertNotFound();
    $this->actingAs($autre)->post('/eleve/tuteur/demandes', ['conversation' => $conversation->uuid, 'demande' => 'plus_simple'])->assertNotFound();
    $this->actingAs($autre)->post("/eleve/tuteur/reponses/{$reponse->uuid}/signaler", ['motif' => 'fausse'])->assertNotFound();
    expect($reponse->fresh()->signale_le)->toBeNull();
});

test('une annale au corrigé réservé n’ouvre pas le tuteur, sauf pour l’abonné', function () {
    $bepc = Examen::where('code', 'BEPC')->sole();
    $maths = Matiere::where('slug', 'maths')->sole();
    $notion = notionDeTest();
    annalePubliee($bepc, null, $maths, 2024, [$notion]);
    $ancienne = annalePubliee($bepc, null, $maths, 2021, [$notion]);
    $question = Question::query()->where('sujet_partie_id', $ancienne->parties()->value('id'))->sole();

    expliquer($this->eleve, $question)->assertStatus(403)->assertJson(['raison' => 'corrige_reserve']);
    expect($this->moteur->requetes)->toBe([]);

    abonner($this->eleve);
    expliquer($this->eleve, $question)->assertOk();
});

test('« Signaler cette réponse » : une fois, avec son motif', function () {
    expliquer($this->eleve, $this->question)->streamedContent();
    $reponse = MessageTuteur::query()->where('role', 'tuteur')->sole();

    $this->actingAs($this->eleve)->post("/eleve/tuteur/reponses/{$reponse->uuid}/signaler", ['motif' => 'pas_claire'])->assertNoContent();
    $this->actingAs($this->eleve)->post("/eleve/tuteur/reponses/{$reponse->uuid}/signaler", ['motif' => 'fausse'])->assertNoContent();

    expect($reponse->fresh()->signale_le)->not->toBeNull()
        ->and($reponse->fresh()->signale_motif->value)->toBe('pas_claire');

    $this->actingAs($this->eleve)->post("/eleve/tuteur/reponses/{$reponse->uuid}/signaler", ['motif' => 'nimporte'])->assertSessionHasErrors('motif');
});

test('« Mon tuteur » : quota, matières de l’élève et conversations', function () {
    expliquer($this->eleve, $this->question)->streamedContent();
    $conversation = ConversationTuteur::sole();

    $this->actingAs($this->eleve)->get('/eleve/tuteur')
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page->component('eleve/tuteur')
            ->where('quota.restants', 2)
            ->where('quota.limite', 3)
            ->where('matieres', fn ($matieres) => collect($matieres)->pluck('slug')->contains('maths') && ! collect($matieres)->pluck('slug')->contains('philosophie'))
            ->has('conversations', 1)
            ->where('conversations.0.uuid', $conversation->uuid)
            ->where('conversation', null));

    $this->actingAs($this->eleve)->get("/eleve/tuteur/{$conversation->uuid}")
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page->component('eleve/tuteur')
            ->where('conversation.uuid', $conversation->uuid)
            ->has('conversation.messages', 2)
            ->where('conversation.messages.0.role', 'eleve')
            ->where('conversation.messages.1.role', 'tuteur')
            ->where('conversation.relances_restantes', 5));
});

test('le quota du tuteur est partagé avec les pages élève, et seulement elles', function () {
    $this->actingAs($this->eleve)->get('/eleve/tuteur')
        ->assertInertia(fn (AssertableInertia $page) => $page->where('tuteur.restants', 3));

    $redacteur = User::factory()->avecRole(Role::Redacteur)->create();
    $this->actingAs($redacteur)->get('/contenu')
        ->assertInertia(fn (AssertableInertia $page) => $page->where('tuteur', null));
});

test('une demande mal formée est refusée avant tout appel', function () {
    $this->actingAs($this->eleve)->post('/eleve/tuteur/demandes', ['demande' => 'question', 'matiere' => 'maths', 'texte' => '   '])
        ->assertStatus(422)->assertJson(['raison' => 'texte_vide']);
    $this->actingAs($this->eleve)->post('/eleve/tuteur/demandes', ['demande' => 'plus_simple'])
        ->assertStatus(422)->assertJson(['raison' => 'demande_invalide']);
    $this->actingAs($this->eleve)->postJson('/eleve/tuteur/demandes', ['demande' => 'question', 'matiere' => 'maths', 'texte' => str_repeat('a', 401)])
        ->assertStatus(422)->assertJsonValidationErrors('texte');

    expect($this->moteur->requetes)->toBe([]);
});
