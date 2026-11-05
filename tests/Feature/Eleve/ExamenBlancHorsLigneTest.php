<?php

use App\Enums\Filiere;
use App\Enums\ModeTentative;
use App\Enums\Role;
use App\Enums\TypeQuestion;
use App\Enums\TypeSujet;
use App\Models\Epreuve;
use App\Models\Examen;
use App\Models\ExamenBlanc;
use App\Models\Matiere;
use App\Models\Question;
use App\Models\Sujet;
use App\Models\Tentative;
use App\Models\User;
use App\Services\Annales\SujetService;
use App\Services\ContenuService;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

/*
 * HORS_LIGNE.md A.14 n° 7 — `examen_blanc.terminer` : la note est
 * **recalculée par le serveur** contre les versions vues, une horloge douteuse
 * est signalée (jamais sanctionnée), un même examen reçu deux fois ne compte
 * qu'une fois. Puis le résultat, gardé (404 pour un autre élève), et la
 * moyenne d'admission saisie par l'équipe.
 */

beforeEach(function () {
    $this->eleve = eleveAvecProfil('BEPC');
    $this->jeton = appareilDe($this->eleve);
    $this->notion = notionDeTest();
    $this->sujet = sujetPourExamen($this->notion);
    $this->questions = $this->sujet->questions()->orderBy('sujet_parties.ordre')->orderBy('ordre_sujet')->get();
});

/**
 * Une annale de BEPC publiée par le circuit réel : partie 1 (4 points, deux
 * QCM, bonne réponse « a »), partie 2 (6 points, une question ouverte au
 * barème de 2 + 2 points).
 */
function sujetPourExamen($notion): Sujet
{
    $sujets = app(SujetService::class);
    $contenu = app(ContenuService::class);
    $redacteur = User::factory()->avecRole(Role::Redacteur)->create();

    $sujet = $sujets->creer($redacteur, [
        'examen' => Examen::where('code', 'BEPC')->sole(), 'serie' => null, 'matiere' => Matiere::where('slug', 'maths')->sole(),
        'filiere' => Filiere::Generale, 'session' => 2024, 'type' => TypeSujet::Officiel, 'titre' => 'Maths BEPC 2024',
    ]);
    $champs = fn (array $donnees, array $attendue) => [
        'enonce' => blocsDeTest('Une question'), 'donnees' => $donnees, 'attendue' => $attendue,
        'indices' => [], 'corrige' => [['titre' => '', 'blocs' => blocsDeTest('Le corrigé.')]], 'difficulte' => 2,
    ];

    $premiere = $sujets->ajouterPartie($sujet, $redacteur, 'Exercice 1', 4);
    foreach ([1, 2] as $_) {
        $q = $sujets->ajouterQuestion($premiere, $redacteur, $notion, TypeQuestion::QcmUne);
        $contenu->enregistrerQuestion($q, $redacteur, $champs(['options' => [['id' => 'a', 'texte' => 'Oui'], ['id' => 'b', 'texte' => 'Non']]], ['option' => 'a']), 0);
    }

    $seconde = $sujets->ajouterPartie($sujet->fresh(), $redacteur, 'Exercice 2', 6);
    $q = $sujets->ajouterQuestion($seconde, $redacteur, $notion, TypeQuestion::Ouverte);
    $contenu->enregistrerQuestion($q, $redacteur, $champs(['bareme' => [
        ['id' => 'c1', 'critere' => 'Cite la propriété.', 'points' => 2],
        ['id' => 'c2', 'critere' => 'Conclut juste.', 'points' => 2],
    ]], []), 0);

    return $sujets->publier($sujets->soumettre($sujet->fresh(), $redacteur), User::factory()->avecRole(Role::Relecteur)->create())->fresh();
}

/** La charge de `examen_blanc.terminer`, telle que l'appareil l'envoie. */
function chargeExamen(object $test, array $reponses, array $champs = []): array
{
    return [
        'sujet' => $test->sujet->uuid,
        'version' => 1,
        'commence_le' => now()->subMinutes(100)->toIso8601ZuluString('millisecond'),
        'termine_le' => now()->subMinute()->toIso8601ZuluString('millisecond'),
        'duree_minutes' => 120,
        'origine_duree' => 'choisie',
        'temps_ecoule' => false,
        'note_appareil' => 20,
        'horloge_suspecte' => false,
        'motif_horloge' => null,
        'reponses' => $reponses,
        ...$champs,
    ];
}

/** Réponse à la question de rang `$rang` (0, 1 : QCM ; 2 : rédaction). */
function reponseA(object $test, int $rang, ?array $reponse, ?array $criteres = null): array
{
    return [$test->questions[$rang]->uuid => ['version' => 1, 'reponse' => $reponse, 'criteres' => $criteres]];
}

test('le serveur recalcule la note : ce que dit l\'appareil ne compte pas (A.14 n° 7)', function () {
    $geste = geste($this->eleve, 'examen_blanc.terminer', chargeExamen($this, [
        ...reponseA($this, 0, ['option' => 'a']),
        ...reponseA($this, 1, ['option' => 'b']),
        ...reponseA($this, 2, ['texte' => 'Ma rédaction.'], ['c1']),
    ]));

    envoyer($this->jeton, [$geste])->assertJsonPath('resultats.0.verdict', 'acceptee');

    // Relu en base (CLAUDE.md § 4). Partie 1 : 2 / 4 ; partie 2 : 3 / 6 → 5 / 10.
    $examen = ExamenBlanc::query()->sole();
    expect($examen->uuid)->toBe($geste['uuid'])
        ->and((float) $examen->note_sur_20)->toBe(10.0)
        ->and((float) $examen->note_appareil)->toBe(20.0)
        ->and($examen->details['parties'][0]['points'])->toEqual(2)
        ->and($examen->details['parties'][1]['points'])->toEqual(3)
        ->and($examen->horloge_suspecte)->toBeFalse()
        ->and($examen->origine_duree)->toBe('choisie');

    // Chaque réponse est une tentative `examen_blanc`, recorrigée.
    $tentatives = Tentative::query()->orderBy('id')->get();
    expect($tentatives)->toHaveCount(3)
        ->and($tentatives->every(fn (Tentative $t) => $t->mode === ModeTentative::ExamenBlanc))->toBeTrue()
        ->and($tentatives->pluck('score')->all())->toBe([100, 0, 50]);
});

test('un même examen reçu deux fois : une seule note, rien de rejoué', function () {
    $geste = geste($this->eleve, 'examen_blanc.terminer', chargeExamen($this, reponseA($this, 0, ['option' => 'a'])));

    envoyer($this->jeton, [$geste])->assertJsonPath('resultats.0.verdict', 'acceptee');
    envoyer($this->jeton, [$geste])->assertJsonPath('resultats.0.verdict', 'deja_recue');

    expect(ExamenBlanc::query()->count())->toBe(1)
        ->and(Tentative::query()->count())->toBe(1);
});

test('une horloge douteuse est signalée, jamais sanctionnée', function (array $champs, string $motif) {
    envoyer($this->jeton, [geste($this->eleve, 'examen_blanc.terminer', chargeExamen($this, reponseA($this, 0, ['option' => 'a']), $champs))])
        ->assertJsonPath('resultats.0.verdict', 'acceptee');

    $examen = ExamenBlanc::query()->sole();
    expect($examen->horloge_suspecte)->toBeTrue()
        ->and($examen->motif_horloge)->toContain($motif)
        // La note reste calculée.
        ->and((float) $examen->note_sur_20)->toBeGreaterThan(0);
})->with([
    'plus long que sa durée' => [['commence_le' => now()->subHours(3)->toIso8601ZuluString(), 'termine_le' => now()->subMinute()->toIso8601ZuluString()], 'plus longtemps'],
    'fini avant d\'avoir commencé' => [['commence_le' => now()->subMinute()->toIso8601ZuluString(), 'termine_le' => now()->subMinutes(30)->toIso8601ZuluString()], 'reculé'],
    'saut vu par l\'appareil' => [['horloge_suspecte' => true, 'motif_horloge' => 'L’heure du téléphone a sauté de plus de 5 minutes pendant l’examen.'], 'sauté'],
]);

test('sans réponse, une question vaut 0 et ne crée pas de tentative', function () {
    envoyer($this->jeton, [geste($this->eleve, 'examen_blanc.terminer', chargeExamen($this, [
        ...reponseA($this, 0, null),
        ...reponseA($this, 2, ['texte' => 'Rédaction non évaluée.']),
    ]))])->assertJsonPath('resultats.0.verdict', 'acceptee');

    expect((float) ExamenBlanc::query()->sole()->note_sur_20)->toBe(0.0)
        ->and(Tentative::query()->count())->toBe(1);
});

test('refus : version jamais publiée, réponse mal formée, durée absurde, annale retirée', function () {
    envoyer($this->jeton, [
        geste($this->eleve, 'examen_blanc.terminer', chargeExamen($this, [], ['version' => 7])),
        geste($this->eleve, 'examen_blanc.terminer', chargeExamen($this, reponseA($this, 0, ['inconnu' => 1]))),
        geste($this->eleve, 'examen_blanc.terminer', chargeExamen($this, [], ['duree_minutes' => 2])),
    ])
        ->assertJsonPath('resultats.0.verdict', 'rejetee')
        ->assertJsonPath('resultats.0.motif', 'Cette version de l\'annale n\'a jamais été publiée.')
        ->assertJsonPath('resultats.1.verdict', 'rejetee')
        ->assertJsonPath('resultats.2.verdict', 'rejetee');

    // Retirée du catalogue de l'élève (CatalogueEleve) : pas de note.
    app(ContenuService::class)->archiver($this->sujet, User::factory()->avecRole(Role::AdminContenu)->create());
    envoyer($this->jeton, [geste($this->eleve, 'examen_blanc.terminer', chargeExamen($this, []))])
        ->assertJsonPath('resultats.0.verdict', 'rejetee')
        ->assertJsonPath('resultats.0.motif', "Cette annale n'est plus proposée : ton examen ne peut pas être noté.");

    expect(ExamenBlanc::query()->count())->toBe(0);
});

test('le résultat : à son élève seulement ; verdict seulement si l\'équipe a saisi la moyenne d\'admission', function () {
    $geste = geste($this->eleve, 'examen_blanc.terminer', chargeExamen($this, [...reponseA($this, 0, ['option' => 'a']), ...reponseA($this, 1, ['option' => 'a'])]));
    envoyer($this->jeton, [$geste]);

    $this->actingAs($this->eleve)->get(route('eleve.examens-blancs.show', $geste['uuid']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('eleve/examen-blanc')
            ->where('examen.note', 8)
            ->where('verdict', null)
            ->has('sujet.parties', 2)
            ->has('examen.parties', 2));

    Examen::where('code', 'BEPC')->update(['moyenne_admission' => 10]);

    $this->get(route('eleve.examens-blancs.show', $geste['uuid']))
        ->assertInertia(fn (Assert $page) => $page->where('verdict.seuil', 10)->where('verdict.au_dessus', false));

    $this->get(route('eleve.examens-blancs.index'))
        ->assertInertia(fn (Assert $page) => $page->has('examens', 1)->where('moyenne_admission', 10));

    $this->actingAs(eleveAvecProfil('BEPC'))->get(route('eleve.examens-blancs.show', $geste['uuid']))->assertNotFound();
});

test('l\'équipe saisit la moyenne d\'admission dans le référentiel', function () {
    $pedagogie = User::factory()->avecRole(Role::AdminContenu)->create();
    $bepc = Examen::where('code', 'BEPC')->sole();

    $this->actingAs($pedagogie)->put(route('contenu.referentiel.examens.session', $bepc), ['moyenne_admission' => '10.5'])
        ->assertRedirect();
    expect($bepc->fresh()->moyenne_admission)->toBe('10.50');

    $this->put(route('contenu.referentiel.examens.session', $bepc), ['moyenne_admission' => 25])
        ->assertSessionHasErrors('moyenne_admission');

    $this->actingAs(User::factory()->avecRole(Role::Redacteur)->create())
        ->put(route('contenu.referentiel.examens.session', $bepc), ['moyenne_admission' => 12])
        ->assertForbidden();
});

test('l\'annale donne la durée de l\'épreuve quand le sujet n\'imprime pas la sienne', function () {
    Epreuve::query()->where('matiere_id', $this->sujet->matiere_id)->where('examen_id', $this->sujet->examen_id)->update(['duree_minutes' => 120]);

    $this->actingAs($this->eleve)->get(route('eleve.annales.show', ['sujet' => $this->sujet, 'mode' => 'examen']))
        ->assertInertia(fn (Assert $page) => $page->where('mode', 'examen')->where('duree_epreuve', 120)->where('sujet.duree_minutes', null));

    expect(Str::isUuid($this->sujet->uuid))->toBeTrue()
        ->and(Question::query()->count())->toBe(3);
});
