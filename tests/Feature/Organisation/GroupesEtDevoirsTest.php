<?php

use App\Enums\Role;
use App\Models\Examen;
use App\Models\Groupe;
use App\Models\Maitrise;
use App\Models\Seance;
use App\Models\User;
use App\Services\SeanceService;
use App\Services\TentativeService;
use Carbon\CarbonImmutable;
use Database\Seeders\ReferentielSeeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

/*
 * Lot 11 (PLAN M13-M14) : groupes et devoirs, par les vraies routes.
 * Critère du lot : « un enseignant voit les notions faibles de sa classe ;
 * rien d'une autre classe ».
 */

afterEach(fn () => Carbon::setTestNow());

/** Un enseignant crée un groupe BEPC par son écran. */
function groupeCreePar(User $enseignant, string $nom = '10e A'): Groupe
{
    test()->seed(ReferentielSeeder::class);

    test()->actingAs($enseignant)
        ->post(route('enseignant.groupes.store'), ['nom' => $nom, 'examen' => Examen::where('code', 'BEPC')->value('id')])
        ->assertRedirect();

    return Groupe::query()->where('enseignant_id', $enseignant->id)->latest('id')->firstOrFail();
}

function rejoindre(User $eleve, Groupe $groupe): void
{
    test()->actingAs($eleve)
        ->post(route('eleve.groupes.rejoindre'), ['code' => strtolower(substr($groupe->code, 0, 3).' '.substr($groupe->code, 3))])
        ->assertRedirect(route('eleve.groupes.index'));
}

function maitriser(User $eleve, int $notionId, int $score): void
{
    Maitrise::create([
        'user_id' => $eleve->id,
        'notion_id' => $notionId,
        'score' => $score,
        'reponses' => 3,
        'palier' => 0,
        'derniere_reponse_le' => CarbonImmutable::now(),
        'maj_le' => CarbonImmutable::now(),
    ]);
}

beforeEach(function () {
    $this->enseignant = User::factory()->avecRole(Role::Enseignant)->create();
    $this->eleve = eleveAvecProfil('BEPC');
});

test('l\'enseignant crée un groupe ; l\'élève le rejoint par son code (casse et espaces ignorés)', function () {
    $groupe = groupeCreePar($this->enseignant);

    expect($groupe->code)->toMatch('/^[A-Z0-9]{6}$/')
        ->and($groupe->classe_id)->not->toBeNull();

    rejoindre($this->eleve, $groupe);

    $this->actingAs($this->eleve)->get(route('eleve.groupes.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('eleve/groupes')
            ->has('groupes', 1)
            ->where('groupes.0.nom', '10e A')
            ->where('groupes.0.enseignant', $this->enseignant->prenom)
            // Décision 5 : aucun autre élève n'est montré.
            ->missing('groupes.0.eleves'));
});

test('un élève d\'un autre examen, un code inconnu, un élève retiré : refusés avec la raison', function () {
    $groupe = groupeCreePar($this->enseignant);
    $bachelier = eleveAvecProfil('BAC', 'SE');

    $this->actingAs($bachelier)->post(route('eleve.groupes.rejoindre'), ['code' => $groupe->code])
        ->assertSessionHasErrors(['code' => 'Ce groupe prépare le BEPC : ce n\'est pas ton examen.']);
    $this->actingAs($this->eleve)->post(route('eleve.groupes.rejoindre'), ['code' => 'ZZZZZZ'])
        ->assertSessionHasErrors('code');

    rejoindre($this->eleve, $groupe);
    $this->actingAs($this->enseignant)->delete(route('enseignant.groupes.eleves.retirer', [$groupe, $this->eleve]))->assertRedirect();

    $this->actingAs($this->eleve)->post(route('eleve.groupes.rejoindre'), ['code' => $groupe->code])
        ->assertSessionHasErrors('code');
    expect($groupe->eleves()->count())->toBe(0);
});

test('critère du lot 11 : l\'enseignant voit les notions faibles de SA classe, rien d\'une autre', function () {
    $faible = notionDeTest('Le théorème de Thalès');
    $solide = notionDeTest('Le théorème de Pythagore');
    $autreClasse = notionDeTest('Les angles inscrits');
    questionDeTest($faible);
    questionDeTest($solide);
    questionDeTest($autreClasse);

    $groupeA = groupeCreePar($this->enseignant, '10e A');
    $collegue = User::factory()->avecRole(Role::Enseignant)->create();
    $groupeB = groupeCreePar($collegue, '10e B');

    $deuxieme = eleveAvecProfil('BEPC');
    $ailleurs = eleveAvecProfil('BEPC');
    rejoindre($this->eleve, $groupeA);
    rejoindre($deuxieme, $groupeA);
    rejoindre($ailleurs, $groupeB);

    maitriser($this->eleve, $faible->id, 20);
    maitriser($deuxieme, $faible->id, 40);
    maitriser($this->eleve, $solide->id, 95);
    // Un élève de l'autre classe, très faible sur une notion que la classe A n'a pas travaillée.
    maitriser($ailleurs, $autreClasse->id, 5);

    $this->actingAs($this->enseignant)->get(route('enseignant.groupes.show', $groupeA))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('enseignant/groupe')
            ->where('suivi.resume.eleves', 2)
            ->has('suivi.notions_faibles', 1)
            ->where('suivi.notions_faibles.0.notion', 'Le théorème de Thalès')
            ->where('suivi.notions_faibles.0.moyenne', 30)
            ->where('suivi.notions_faibles.0.fragiles', 2)
            ->has('suivi.eleves', 2)
            ->where('suivi.eleves', fn ($eleves) => collect($eleves)->pluck('id')->sort()->values()->all() === collect([$this->eleve->id, $deuxieme->id])->sort()->values()->all())
            // Données minimales : jamais le numéro.
            ->missing('suivi.eleves.0.telephone'));

    // Le groupe d'un collègue n'existe pas (404, pas 403).
    $this->actingAs($this->enseignant)->get(route('enseignant.groupes.show', $groupeB))->assertNotFound();
    $this->actingAs($this->enseignant)->delete(route('enseignant.groupes.eleves.retirer', [$groupeB, $ailleurs]))->assertNotFound();
});

test('un élève parti n\'est plus compté dans les notions de la classe', function () {
    $notion = notionDeTest('Le théorème de Thalès');
    questionDeTest($notion);
    $groupe = groupeCreePar($this->enseignant);
    rejoindre($this->eleve, $groupe);
    maitriser($this->eleve, $notion->id, 10);

    $this->actingAs($this->eleve)->delete(route('eleve.groupes.quitter', $groupe))->assertRedirect();

    $this->actingAs($this->enseignant)->get(route('enseignant.groupes.show', $groupe))
        ->assertInertia(fn (Assert $page) => $page->where('suivi.resume.eleves', 0)->has('suivi.notions_faibles', 0));
});

test('un devoir de questions publiées ; l\'élève le fait comme une séance, par la file ; l\'enseignant voit le rendu', function () {
    Carbon::setTestNow('2026-11-14 10:00');
    $notion = notionDeTest();
    $q1 = questionDeTest($notion);
    $q2 = questionDeTest($notion);
    $brouillon = questionDeTest($notion, 'brouillon');
    $groupe = groupeCreePar($this->enseignant);
    rejoindre($this->eleve, $groupe);

    // Écran de création : seules les questions publiées sont proposées.
    $this->actingAs($this->enseignant)->get(route('enseignant.devoirs.create', $groupe))
        ->assertInertia(fn (Assert $page) => $page
            ->component('enseignant/devoir-nouveau')
            ->has('questions', 2));

    $this->actingAs($this->enseignant)->post(route('enseignant.devoirs.store', $groupe), [
        'titre' => 'Pythagore',
        'echeance' => '2026-11-14',
        'questions' => [$brouillon->uuid],
    ])->assertSessionHasErrors('questions');

    $this->actingAs($this->enseignant)->post(route('enseignant.devoirs.store', $groupe), [
        'titre' => 'Pythagore',
        'consigne' => 'Pour vendredi.',
        'echeance' => '2026-11-20',
        'questions' => [$q2->uuid, $q1->uuid],
    ])->assertRedirect();

    $devoir = $groupe->devoirs()->sole();
    expect($devoir->echeance_le->format('Y-m-d H:i'))->toBe('2026-11-20 23:59')
        ->and($devoir->questions()->pluck('questions.id')->all())->toBe([$q2->id, $q1->id]);

    // L'élève commence : une séance du devoir, une seule, qui n'est pas sa séance du jour.
    $this->actingAs($this->eleve)->post(route('eleve.devoirs.commencer', $devoir))->assertRedirect();
    $this->actingAs($this->eleve)->post(route('eleve.devoirs.commencer', $devoir))->assertRedirect();
    $seance = Seance::query()->where('devoir_id', $devoir->id)->sole();
    expect($seance->user_id)->toBe($this->eleve->id)
        ->and($seance->questions)->toBe([$q2->id, $q1->id]);

    $this->actingAs($this->eleve)->get(route('eleve.seances.show', $seance))
        ->assertInertia(fn (Assert $page) => $page
            ->component('eleve/seance')
            ->where('seance.devoir.titre', 'Pythagore')
            ->has('questions', 2));

    // Réponses et fin par les services de la file (les mêmes qu'une séance du jour).
    $maintenant = CarbonImmutable::now();
    app(TentativeService::class)->enregistrer($this->eleve, (string) Str::uuid7(), $q2, 1, ['option' => 'b'], $seance, 20, $maintenant, $maintenant);
    app(TentativeService::class)->enregistrer($this->eleve, (string) Str::uuid7(), $q1, 1, ['option' => 'a'], $seance, 20, $maintenant, $maintenant);
    app(SeanceService::class)->terminer($this->eleve, $seance, $maintenant);

    $this->actingAs($this->enseignant)->get(route('enseignant.devoirs.show', $devoir))
        ->assertInertia(fn (Assert $page) => $page
            ->component('enseignant/devoir')
            ->where('suivi.eleves.0.etat', 'rendu')
            ->where('suivi.eleves.0.en_retard', false)
            ->where('suivi.eleves.0.reponses', 2)
            ->where('suivi.eleves.0.score', 50));

    // La séance du devoir n'est pas « la séance du jour en cours ».
    expect(app(SeanceService::class)->enCours($this->eleve))->toBeNull();
});

test('un rendu après l\'échéance est accepté, marqué en retard', function () {
    Carbon::setTestNow('2026-11-14 10:00');
    $q = questionDeTest(notionDeTest());
    $groupe = groupeCreePar($this->enseignant);
    rejoindre($this->eleve, $groupe);
    $this->actingAs($this->enseignant)->post(route('enseignant.devoirs.store', $groupe), [
        'titre' => 'Court', 'echeance' => '2026-11-14', 'questions' => [$q->uuid],
    ])->assertRedirect();
    $devoir = $groupe->devoirs()->sole();

    $this->actingAs($this->eleve)->post(route('eleve.devoirs.commencer', $devoir));
    $seance = Seance::query()->where('devoir_id', $devoir->id)->sole();

    Carbon::setTestNow('2026-11-16 09:00');
    app(SeanceService::class)->terminer($this->eleve, $seance, CarbonImmutable::now());

    // Deux jours ont passé : l'enseignant (session de 12 h, décision 4) se reconnecte.
    $this->flushSession();
    $this->actingAs($this->enseignant)->get(route('enseignant.devoirs.show', $devoir))
        ->assertInertia(fn (Assert $page) => $page->where('suivi.eleves.0.etat', 'rendu')->where('suivi.eleves.0.en_retard', true));
});

test('le devoir d\'un groupe dont l\'élève n\'est pas membre n\'existe pas pour lui', function () {
    $q = questionDeTest(notionDeTest());
    $groupe = groupeCreePar($this->enseignant);
    $this->actingAs($this->enseignant)->post(route('enseignant.devoirs.store', $groupe), [
        'titre' => 'Privé', 'echeance' => now()->addDays(3)->toDateString(), 'questions' => [$q->uuid],
    ]);
    $devoir = $groupe->devoirs()->sole();

    $this->actingAs($this->eleve)->post(route('eleve.devoirs.commencer', $devoir))->assertNotFound();

    $collegue = User::factory()->avecRole(Role::Enseignant)->create();
    $this->actingAs($collegue)->get(route('enseignant.devoirs.show', $devoir))->assertNotFound();
    $this->actingAs($collegue)->get(route('enseignant.devoirs.create', $groupe))->assertNotFound();
    $this->actingAs($collegue)->post(route('enseignant.devoirs.store', $groupe), [
        'titre' => 'Intrus', 'echeance' => now()->addDays(3)->toDateString(), 'questions' => [$q->uuid],
    ])->assertNotFound();
    expect($groupe->devoirs()->count())->toBe(1);
});

test('l\'accueil enseignant ne liste que ses groupes', function () {
    groupeCreePar($this->enseignant, 'Le mien');
    groupeCreePar(User::factory()->avecRole(Role::Enseignant)->create(), 'Celui d\'un autre');

    $this->actingAs($this->enseignant)->get(route('enseignant.accueil'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('enseignant/accueil')
            ->has('groupes', 1)
            ->where('groupes.0.nom', 'Le mien'));
});
