<?php

use App\Enums\Role;
use App\Enums\StatutRessource;
use App\Jobs\GenererPack;
use App\Models\Epreuve;
use App\Models\RessourceExterne;
use App\Models\User;
use App\Services\PackService;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Http;
use Illuminate\Testing\TestResponse;
use Inertia\Testing\AssertableInertia as Assert;

/*
 * Lot 12 (PLAN M19) : ressources externes — liste fermée de sites, un
 * relecteur différent vérifie, seule une ressource vérifiée arrive chez
 * l'élève (dans la leçon et dans le pack), les liens cassés sortent.
 */

beforeEach(function () {
    $this->notion = notionDeTest();
    $this->lecon = leconPubliee($this->notion);
    $this->redacteur = User::factory()->avecRole(Role::Redacteur)->create(['pseudo' => 'redac']);
    $this->relecteur = User::factory()->avecRole(Role::Relecteur)->create(['pseudo' => 'relec']);
});

function proposer(User $auteur, int $notion, string $url = 'https://fr.wikipedia.org/wiki/Th%C3%A9or%C3%A8me_de_Pythagore', array $autres = []): TestResponse
{
    return test()->actingAs($auteur)->post(route('contenu.ressources.store'), [
        'notion' => $notion,
        'url' => $url,
        'titre' => 'Théorème de Pythagore',
        'type' => 'encyclopedie',
        ...$autres,
    ]);
}

test('un rédacteur propose, un autre relecteur vérifie ; l\'élève voit alors le lien sous la leçon', function () {
    proposer($this->redacteur, $this->notion->id)->assertSessionHasNoErrors()->assertRedirect();
    $ressource = RessourceExterne::query()->firstOrFail();
    $eleve = eleveAvecProfil('BEPC');

    expect($ressource->statut)->toBe(StatutRessource::Proposee)
        ->and($ressource->domaine)->toBe('wikipedia.org')
        ->and($ressource->auteur_id)->toBe($this->redacteur->id);

    $this->actingAs($eleve)->get(route('eleve.lecons.show', $this->lecon))
        ->assertInertia(fn (Assert $page) => $page->has('lecon.ressources', 0));

    $this->actingAs($this->relecteur)->post(route('contenu.ressources.verifier', $ressource->uuid))->assertSessionHasNoErrors();

    expect($ressource->refresh()->statut)->toBe(StatutRessource::Verifiee)
        ->and($ressource->verifiee_par_id)->toBe($this->relecteur->id);

    $this->actingAs($eleve)->get(route('eleve.lecons.show', $this->lecon))
        ->assertInertia(fn (Assert $page) => $page
            ->has('lecon.ressources', 1)
            ->where('lecon.ressources.0.site', 'Wikipédia')
            ->where('lecon.ressources.0.poids_ko', 900)
            ->where('lecon.ressources.0.avec_suggestions', false)
            // Ni l'auteur ni le relecteur ne sont envoyés à l'élève.
            ->missing('lecon.ressources.0.auteur'));
});

test('on ne vérifie jamais sa propre proposition, même responsable pédagogique', function () {
    $pedagogie = User::factory()->avecRole(Role::AdminContenu)->create();
    proposer($pedagogie, $this->notion->id)->assertSessionHasNoErrors();
    $ressource = RessourceExterne::query()->firstOrFail();

    $this->actingAs($pedagogie)->post(route('contenu.ressources.verifier', $ressource->uuid))
        ->assertSessionHasErrors('ressource');
    // Un rédacteur seul ne vérifie rien (route gardée).
    $this->actingAs($this->redacteur)->post(route('contenu.ressources.verifier', $ressource->uuid))->assertForbidden();

    expect($ressource->refresh()->statut)->toBe(StatutRessource::Proposee);
});

test('liste fermée : un site hors liste, un lien en http ou raccourci sont refusés', function (string $url) {
    proposer($this->redacteur, $this->notion->id, $url)->assertSessionHasErrors('url');

    expect(RessourceExterne::query()->count())->toBe(0);
})->with([
    'site hors liste' => 'https://www.exemple-douteux.com/page',
    'pas https' => 'http://fr.wikipedia.org/wiki/Cosinus',
    'raccourci' => 'https://bit.ly/3abcd',
    'domaine déguisé' => 'https://wikipedia.org.exemple.com/page',
]);

test('une vidéo YouTube : poids estimé par sa durée, l\'élève est prévenu des suggestions', function () {
    proposer($this->redacteur, $this->notion->id, 'https://www.youtube.com/watch?v=abc123', ['type' => 'video', 'duree_minutes' => 6])->assertSessionHasNoErrors();
    $ressource = RessourceExterne::query()->firstOrFail();
    $this->actingAs($this->relecteur)->post(route('contenu.ressources.verifier', $ressource->uuid));

    expect($ressource->refresh()->pourEleve())
        ->toMatchArray(['site' => 'YouTube', 'poids_ko' => 9600, 'avec_suggestions' => true, 'duree_minutes' => 6]);
});

test('vérifier ou retirer fait regénérer le pack de la matière ; la leçon du pack porte la ressource', function () {
    Bus::fake([GenererPack::class]);
    $pack = app(PackService::class)->pour(Epreuve::query()->whereHas('matiere', fn ($m) => $m->where('slug', 'maths'))->whereHas('examen', fn ($e) => $e->where('code', 'BEPC'))->firstOrFail());
    proposer($this->redacteur, $this->notion->id);
    $ressource = RessourceExterne::query()->firstOrFail();

    $this->actingAs($this->relecteur)->post(route('contenu.ressources.verifier', $ressource->uuid));
    Bus::assertDispatched(GenererPack::class);

    app(PackService::class)->generer($pack);
    $element = $pack->elements()->where('cle', 'lecon:'.$this->lecon->uuid)->firstOrFail();
    expect(json_decode($element->props, true)['lecon']['ressources'][0]['uuid'])->toBe($ressource->uuid);

    $this->actingAs($this->relecteur)->post(route('contenu.ressources.retirer', $ressource->uuid), ['motif' => 'La page a changé.'])->assertSessionHasNoErrors();
    expect($ressource->refresh()->statut)->toBe(StatutRessource::Retiree);
});

test('ressources:verifier : un lien qui ne répond plus sort de la vue élève, puis y revient', function () {
    proposer($this->redacteur, $this->notion->id);
    $ressource = RessourceExterne::query()->firstOrFail();
    $this->actingAs($this->relecteur)->post(route('contenu.ressources.verifier', $ressource->uuid));
    $eleve = eleveAvecProfil('BEPC');

    $statut = 404;
    Http::fake(function () use (&$statut) {
        return Http::response('', $statut);
    });
    $this->artisan('ressources:verifier')->assertSuccessful();

    expect($ressource->refresh()->lien_casse_le)->not->toBeNull();
    $this->actingAs($eleve)->get(route('eleve.lecons.show', $this->lecon))
        ->assertInertia(fn (Assert $page) => $page->has('lecon.ressources', 0));

    $statut = 200;
    $this->travel(8)->days();
    $this->artisan('ressources:verifier')->assertSuccessful();

    expect($ressource->refresh()->lien_casse_le)->toBeNull();
});

test('une ressource modifiée repasse en vérification ; seul son auteur la modifie', function () {
    proposer($this->redacteur, $this->notion->id);
    $ressource = RessourceExterne::query()->firstOrFail();
    $this->actingAs($this->relecteur)->post(route('contenu.ressources.verifier', $ressource->uuid));
    $autre = User::factory()->avecRole(Role::Redacteur)->create();
    $donnees = ['url' => 'https://fr.vikidia.org/wiki/Pythagore', 'titre' => 'Pythagore', 'type' => 'encyclopedie'];

    $this->actingAs($autre)->put(route('contenu.ressources.update', $ressource->uuid), $donnees)->assertSessionHasErrors('url');
    $this->actingAs($this->redacteur)->put(route('contenu.ressources.update', $ressource->uuid), $donnees)->assertSessionHasNoErrors();

    expect($ressource->refresh())
        ->statut->toBe(StatutRessource::Proposee)
        ->domaine->toBe('vikidia.org')
        ->verifiee_par_id->toBeNull();

    $this->actingAs($this->redacteur)->get(route('contenu.ressources.index'))
        ->assertInertia(fn (Assert $page) => $page->component('contenu/ressources/index')->where('compteurs.a_verifier', 1));
});
