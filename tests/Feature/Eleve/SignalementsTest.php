<?php

use App\Enums\MotifSignalement;
use App\Enums\Role;
use App\Enums\StatutSignalement;
use App\Models\Signalement;
use App\Models\User;
use App\Services\SignalementService;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

/*
 * « Signaler une erreur » (PLAN M5, M17 ; `signalement.creer`, HORS_LIGNE.md
 * A.6) : par la file, une seule fois, dix par jour au plus, seulement sur un
 * contenu que l'élève voit ; l'équipe répond, l'élève lit la réponse, qui
 * ne change plus ensuite.
 */

beforeEach(function () {
    $this->eleve = eleveAvecProfil('BEPC');
    $this->jeton = appareilDe($this->eleve);
});

/** @return array<string, mixed> */
function signaler(User $eleve, string $uuid, array $charge = [], ?string $saisiLe = null): array
{
    return geste($eleve, 'signalement.creer', [
        'cible' => 'question',
        'uuid' => $uuid,
        'version' => 1,
        'motif' => 'corrige',
        'message' => '  Il manque l\'unité.  ',
        ...$charge,
    ], $saisiLe);
}

test('un signalement part par la file, une seule fois', function () {
    $question = questionDeTest(notionDeTest());
    $geste = signaler($this->eleve, $question->uuid);

    envoyer($this->jeton, [$geste])->assertJsonPath('resultats.0.verdict', 'acceptee');
    envoyer($this->jeton, [$geste])->assertJsonPath('resultats.0.verdict', 'deja_recue');

    // Relu en base (CLAUDE.md § 4).
    $signalement = Signalement::query()->sole();
    expect($signalement->uuid)->toBe($geste['uuid'])
        ->and($signalement->cible_id)->toBe($question->id)
        ->and($signalement->motif)->toBe(MotifSignalement::Corrige)
        ->and($signalement->message)->toBe('Il manque l\'unité.')
        ->and($signalement->statut)->toBe(StatutSignalement::Ouvert)
        ->and($signalement->version)->toBe(1);
});

test('dix par jour au plus, puis un refus avec sa phrase ; le lendemain, c\'est reparti', function () {
    $question = questionDeTest(notionDeTest());
    $gestes = array_map(fn () => signaler($this->eleve, $question->uuid), range(1, 11));

    $reponse = envoyer($this->jeton, $gestes)->assertOk();

    expect($reponse->json('resultats.9.verdict'))->toBe('acceptee')
        ->and($reponse->json('resultats.10.verdict'))->toBe('rejetee')
        ->and($reponse->json('resultats.10.motif'))->toContain('10 signalements aujourd\'hui')
        ->and(Signalement::query()->count())->toBe(10);

    $this->travel(1)->day();
    envoyer(appareilDe($this->eleve, $this->jeton), [signaler($this->eleve, $question->uuid)])
        ->assertJsonPath('resultats.0.verdict', 'acceptee');
});

test('on ne signale que ce qu\'on voit', function () {
    $ailleurs = questionDeTest(notionAilleurs('chimie', 'Terminale'));

    envoyer($this->jeton, [
        signaler($this->eleve, $ailleurs->uuid),
        signaler($this->eleve, (string) Str::uuid7()),
        signaler($this->eleve, $ailleurs->uuid, ['motif' => 'inconnu']),
    ])
        ->assertJsonPath('resultats.0.verdict', 'rejetee')
        ->assertJsonPath('resultats.0.motif', 'Ce contenu n\'est plus proposé : rien à signaler.')
        ->assertJsonPath('resultats.1.verdict', 'rejetee')
        ->assertJsonPath('resultats.2.verdict', 'rejetee');

    expect(Signalement::query()->count())->toBe(0);
});

test('une leçon se signale aussi, sans message', function () {
    $lecon = leconPubliee(notionDeTest());

    envoyer($this->jeton, [signaler($this->eleve, $lecon->uuid, ['cible' => 'lecon', 'motif' => 'incomprehensible', 'message' => null])])
        ->assertJsonPath('resultats.0.verdict', 'acceptee');

    expect(Signalement::query()->sole()->message)->toBeNull();
});

test('l\'équipe répond, l\'élève lit, puis la réponse ne change plus', function () {
    $question = questionDeTest(notionDeTest());
    envoyer($this->jeton, [$geste = signaler($this->eleve, $question->uuid)]);
    $relecteur = User::factory()->avecRole(Role::Relecteur)->create();

    // De l'élève, seul son pseudo est montré.
    $this->actingAs($relecteur)->get(route('contenu.signalements.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('contenu/signalements/index')
            ->where('signalements.total', 1)
            ->where('signalements.donnees.0.eleve', $this->eleve->pseudo)
            ->missing('signalements.donnees.0.telephone'));

    $this->get(route('contenu.signalements.show', $geste['uuid']))
        ->assertInertia(fn (Assert $page) => $page->where('question.uuid', $question->uuid)->where('question.version', 1));

    $this->post(route('contenu.signalements.repondre', $geste['uuid']), ['statut' => 'traite', 'reponse' => 'court'])
        ->assertSessionHasErrors('reponse');
    $this->post(route('contenu.signalements.repondre', $geste['uuid']), ['statut' => 'traite', 'reponse' => 'Merci, le corrigé est réparé.'])
        ->assertRedirect(route('contenu.signalements.index'));

    $signalement = Signalement::query()->sole();
    expect($signalement->statut)->toBe(StatutSignalement::Traite)
        ->and($signalement->traite_par_id)->toBe($relecteur->id);

    // L'accueil de l'élève l'annonce ; « Mes signalements » la marque lue.
    $this->actingAs($this->eleve)->get(route('eleve.accueil'))
        ->assertInertia(fn (Assert $page) => $page->where('reponses_signalements', 1));
    $this->get(route('eleve.signalements'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('signalements.0.reponse', 'Merci, le corrigé est réparé.')
            ->where('signalements.0.nouvelle', true));
    $this->get(route('eleve.accueil'))
        ->assertInertia(fn (Assert $page) => $page->where('reponses_signalements', 0));

    $this->actingAs($relecteur)->post(route('contenu.signalements.repondre', $geste['uuid']), ['statut' => 'rejete', 'reponse' => 'Finalement, c\'était juste.'])
        ->assertSessionHasErrors('reponse');
    expect($signalement->fresh()->reponse)->toBe('Merci, le corrigé est réparé.');
});

test('la file des signalements : relecteur et responsable pédagogique seulement', function () {
    $question = questionDeTest(notionDeTest());
    envoyer($this->jeton, [$geste = signaler($this->eleve, $question->uuid)]);

    $this->actingAs(User::factory()->avecRole(Role::Redacteur)->create())
        ->get(route('contenu.signalements.index'))->assertForbidden();
    $this->actingAs($this->eleve)->get(route('contenu.signalements.show', $geste['uuid']))->assertForbidden();
    $this->actingAs(User::factory()->avecRole(Role::AdminContenu)->create())
        ->get(route('contenu.signalements.show', $geste['uuid']))->assertOk();
});

test('un élève ne voit que ses signalements', function () {
    $question = questionDeTest(notionDeTest());
    envoyer($this->jeton, [signaler($this->eleve, $question->uuid)]);

    $this->actingAs(eleveAvecProfil('BEPC'))->get(route('eleve.signalements'))
        ->assertInertia(fn (Assert $page) => $page->has('signalements', 0));
});

test('les motifs de l\'appareil sont ceux du serveur', function () {
    $source = (string) file_get_contents(resource_path('js/components/signaler-erreur.tsx'));
    preg_match_all("/valeur: '([a-z_]+)',\s*libelle:\s*'([^']+)'/", $source, $trouves, PREG_SET_ORDER);
    preg_match('/MESSAGE_MAX = (\d+)/', $source, $max);

    expect(array_map(fn (array $t) => [$t[1], $t[2]], $trouves))
        ->toBe(array_map(fn (MotifSignalement $m) => [$m->value, $m->libelle()], MotifSignalement::cases()))
        ->and((int) ($max[1] ?? 0))->toBe(SignalementService::MESSAGE_MAX);
});
