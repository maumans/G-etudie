<?php

use App\Enums\Role;
use App\Models\Examen;
use App\Models\Groupe;
use App\Models\MotInterdit;
use App\Models\PublicationGroupe;
use App\Models\User;
use App\Services\Communaute\FilGroupeService;
use Database\Seeders\ReferentielSeeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

/*
 * Lot 12 (PLAN M13) : le fil « Questions du groupe », par les vraies routes.
 * Critère du lot : « signalement → masquage en un geste par l'enseignant ».
 */

afterEach(fn () => Carbon::setTestNow());

beforeEach(function () {
    $this->seed(ReferentielSeeder::class);
    $this->enseignant = User::factory()->avecRole(Role::Enseignant)->create(['prenom' => 'Fatoumata']);

    $this->actingAs($this->enseignant)
        ->post(route('enseignant.groupes.store'), ['nom' => '10e A', 'examen' => Examen::where('code', 'BEPC')->value('id')])
        ->assertRedirect();
    $this->groupe = Groupe::query()->where('enseignant_id', $this->enseignant->id)->firstOrFail();

    $this->rejoindre = function (User $eleve, ?Groupe $groupe = null): User {
        $this->actingAs($eleve)->post(route('eleve.groupes.rejoindre'), ['code' => ($groupe ?? $this->groupe)->code])->assertRedirect(route('eleve.groupes.index'));

        return $eleve;
    };

    $this->auteur = ($this->rejoindre)(eleveAvecProfil('BEPC'));
    $this->auteur->update(['pseudo' => 'thierno_k']);
});

function publierDansLeFil(User $eleve, Groupe $groupe, string $texte, ?string $parent = null): PublicationGroupe
{
    Carbon::setTestNow(now()->addMinute());

    test()->actingAs($eleve)
        ->post(route('eleve.fil.publier', $groupe), ['texte' => $texte, 'parent' => $parent, 'uuid' => (string) Str::uuid7()])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    return PublicationGroupe::query()->where('auteur_id', $eleve->id)->latest('id')->firstOrFail();
}

test('critère du lot 12 : un élève signale, l\'enseignant masque en un geste, les élèves ne le voient plus', function () {
    $temoin = ($this->rejoindre)(eleveAvecProfil('BEPC'));
    $publication = publierDansLeFil($this->auteur, $this->groupe, 'Celui qui ne comprend pas Pythagore est vraiment bête.');

    // Un camarade signale.
    $this->actingAs($temoin)
        ->post(route('eleve.fil.signaler', $publication->uuid), ['motif' => 'moquerie'])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    // L'enseignant voit le signalement en tête de son fil…
    $this->actingAs($this->enseignant)->get(route('enseignant.fil.show', $this->groupe))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('enseignant/fil')
            ->where('fil.a_moderer', 1)
            ->where('fil.questions.0.uuid', $publication->uuid)
            ->where('fil.questions.0.signalements', 1)
            // Il voit qui a écrit : prénom et pseudo.
            ->where('fil.questions.0.auteur', $this->auteur->prenom.' (thierno_k)'));

    // … et le masque d'un seul geste, sans confirmation.
    $this->actingAs($this->enseignant)
        ->post(route('enseignant.fil.masquer', $publication->uuid))
        ->assertRedirect();

    $publication->refresh();
    expect($publication->masquee_le)->not->toBeNull()
        ->and($publication->masquee_par)->toBe($this->enseignant->id)
        ->and($publication->masquage)->toBe(PublicationGroupe::MASQUAGE_ENSEIGNANT);

    // Le témoin ne le voit plus ; l'auteur le voit, marqué masqué.
    $this->actingAs($temoin)->get(route('eleve.fil.show', $this->groupe))
        ->assertInertia(fn (Assert $page) => $page->component('eleve/fil')->has('fil.questions', 0));
    $this->actingAs($this->auteur)->get(route('eleve.fil.show', $this->groupe))
        ->assertInertia(fn (Assert $page) => $page->has('fil.questions', 1)->where('fil.questions.0.masquee', true));

    // L'enseignant n'a plus rien à modérer ; le geste est au journal.
    expect(app(FilGroupeService::class)->aModerer($this->groupe))->toBe(0);
    $this->assertDatabaseHas('journal_acces_plateforme', ['action' => 'fil.publication_masquee', 'auteur_id' => $this->enseignant->id, 'cible_id' => $publication->id]);
});

test('les élèves voient le pseudo, jamais le prénom ni le numéro ; l\'enseignant signe de son prénom', function () {
    $publication = publierDansLeFil($this->auteur, $this->groupe, 'Comment trouver l’hypoténuse ?');

    $this->actingAs($this->enseignant)
        ->post(route('enseignant.fil.publier', $this->groupe), ['texte' => 'C’est le côté opposé à l’angle droit.', 'parent' => $publication->uuid])
        ->assertSessionHasNoErrors();

    $lecteur = ($this->rejoindre)(eleveAvecProfil('BEPC'));

    $this->actingAs($lecteur)->get(route('eleve.fil.show', $this->groupe))
        ->assertInertia(fn (Assert $page) => $page
            ->where('fil.questions.0.auteur', 'thierno_k')
            ->where('fil.questions.0.reponses.0.auteur', 'Fatoumata')
            ->where('fil.questions.0.reponses.0.est_enseignant', true)
            ->where('fil.questions.0.auteur_id', null)
            ->where('fil.questions.0', fn ($question) => ! str_contains(json_encode($question), $this->auteur->telephone)
                && ! str_contains(json_encode($question), $this->auteur->prenom)));
});

test('le filtre refuse un numéro, un lien, un mot interdit — et rien n\'est publié', function (string $texte, string $attendu) {
    MotInterdit::create(['mot' => 'idiot']);

    $this->actingAs($this->auteur)
        ->post(route('eleve.fil.publier', $this->groupe), ['texte' => $texte])
        ->assertSessionHasErrors(['texte' => $attendu]);

    expect(PublicationGroupe::query()->count())->toBe(0);
})->with([
    'numéro' => ['Appelle-moi au 622 12 34 56', 'Pas de numéro de téléphone dans le fil : il est lu par tout le groupe.'],
    'lien' => ['Regarde www.exemple.com', 'Pas de lien dans le fil. Pose ta question avec tes mots.'],
    'mot interdit, déguisé' => ['T’es un I.D.I.O.T', 'Ce message contient un mot qui n’a pas sa place ici. Reformule-le poliment.'],
]);

test('trois élèves différents signalent : le message est masqué en attendant l\'enseignant, qui peut le garder', function () {
    $publication = publierDansLeFil($this->auteur, $this->groupe, 'Ce chapitre est nul et vous aussi.');

    foreach (range(1, 3) as $rang) {
        $eleve = ($this->rejoindre)(eleveAvecProfil('BEPC'));
        $this->actingAs($eleve)->post(route('eleve.fil.signaler', $publication->uuid), ['motif' => 'moquerie'])->assertSessionHasNoErrors();
        // Signaler deux fois ne compte qu'une fois.
        $this->actingAs($eleve)->post(route('eleve.fil.signaler', $publication->uuid), ['motif' => 'inadapte'])->assertSessionHasNoErrors();

        expect($publication->refresh()->masquee_le !== null)->toBe($rang === 3);
    }

    expect($publication->masquage)->toBe(PublicationGroupe::MASQUAGE_SIGNALEMENTS)
        ->and(app(FilGroupeService::class)->aModerer($this->groupe))->toBe(1);

    $this->actingAs($this->enseignant)->post(route('enseignant.fil.garder', $publication->uuid))->assertRedirect();

    expect($publication->refresh()->masquee_le)->toBeNull()
        ->and(app(FilGroupeService::class)->aModerer($this->groupe))->toBe(0);
});

test('404 : le fil d\'un autre groupe, le masquage par un autre enseignant ; un élève ne signale pas son message', function () {
    $collegue = User::factory()->avecRole(Role::Enseignant)->create();
    $this->actingAs($collegue)->post(route('enseignant.groupes.store'), ['nom' => '10e B', 'examen' => Examen::where('code', 'BEPC')->value('id')]);
    $groupeB = Groupe::query()->where('enseignant_id', $collegue->id)->firstOrFail();
    $publication = publierDansLeFil($this->auteur, $this->groupe, 'Une question sur Thalès.');
    $etranger = ($this->rejoindre)(eleveAvecProfil('BEPC'), $groupeB);

    $this->actingAs($etranger)->get(route('eleve.fil.show', $this->groupe))->assertNotFound();
    $this->actingAs($etranger)->post(route('eleve.fil.publier', $this->groupe), ['texte' => 'Bonjour à tous'])->assertNotFound();
    $this->actingAs($etranger)->post(route('eleve.fil.signaler', $publication->uuid), ['motif' => 'moquerie'])->assertNotFound();
    $this->actingAs($collegue)->get(route('enseignant.fil.show', $this->groupe))->assertNotFound();
    $this->actingAs($collegue)->post(route('enseignant.fil.masquer', $publication->uuid))->assertNotFound();
    $this->actingAs($this->auteur)->post(route('enseignant.fil.masquer', $publication->uuid))->assertForbidden();

    $this->actingAs($this->auteur)->post(route('eleve.fil.signaler', $publication->uuid), ['motif' => 'moquerie'])
        ->assertSessionHasErrors(['motif' => 'Tu ne peux pas signaler ton propre message.']);

    expect($publication->refresh()->masquee_le)->toBeNull();
});

test('parole retirée, fil fermé, débit : l\'élève lit sans écrire, avec la raison', function () {
    $this->actingAs($this->enseignant)
        ->post(route('enseignant.fil.parole', [$this->groupe, $this->auteur]), ['jours' => 3])
        ->assertRedirect();

    $this->actingAs($this->auteur)->post(route('eleve.fil.publier', $this->groupe), ['texte' => 'Je peux écrire ?'])
        ->assertSessionHasErrors('texte');
    $this->actingAs($this->auteur)->get(route('eleve.fil.show', $this->groupe))
        ->assertInertia(fn (Assert $page) => $page->whereNot('fil.muet_jusqu_au', null));

    $this->actingAs($this->enseignant)->post(route('enseignant.fil.parole', [$this->groupe, $this->auteur]), ['jours' => 0]);
    $this->actingAs($this->enseignant)->post(route('enseignant.fil.fermer', $this->groupe), ['ferme' => true])->assertRedirect();

    $this->actingAs($this->auteur)->post(route('eleve.fil.publier', $this->groupe), ['texte' => 'Et maintenant ?'])
        ->assertSessionHasErrors(['texte' => 'Ton enseignant a fermé le fil pour le moment.']);

    $this->actingAs($this->enseignant)->post(route('enseignant.fil.fermer', $this->groupe), ['ferme' => false]);

    // Deux messages à moins de 30 s : le second est refusé.
    Carbon::setTestNow(now());
    $this->actingAs($this->auteur)->post(route('eleve.fil.publier', $this->groupe), ['texte' => 'Premier message'])->assertSessionHasNoErrors();
    $this->actingAs($this->auteur)->post(route('eleve.fil.publier', $this->groupe), ['texte' => 'Second message'])
        ->assertSessionHasErrors(['texte' => 'Attends quelques secondes avant d\'envoyer un autre message.']);

    expect(PublicationGroupe::query()->where('auteur_id', $this->auteur->id)->count())->toBe(1);
});

test('le même envoi reçu deux fois ne publie qu\'un message', function () {
    $uuid = (string) Str::uuid7();

    foreach ([1, 2] as $fois) {
        Carbon::setTestNow(now()->addMinutes($fois));
        $this->actingAs($this->auteur)->post(route('eleve.fil.publier', $this->groupe), ['texte' => 'Une seule fois', 'uuid' => $uuid])->assertSessionHasNoErrors();
    }

    expect(PublicationGroupe::query()->where('uuid', $uuid)->count())->toBe(1)
        ->and(PublicationGroupe::query()->firstOrFail()->texte)->toBe('Une seule fois');
});
