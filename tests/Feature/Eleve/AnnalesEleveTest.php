<?php

use App\Enums\Filiere;
use App\Enums\ModeTentative;
use App\Enums\Role;
use App\Enums\TypeQuestion;
use App\Enums\TypeSujet;
use App\Models\Examen;
use App\Models\Matiere;
use App\Models\Serie;
use App\Models\Sujet;
use App\Models\Tentative;
use App\Models\User;
use App\Services\Annales\SujetService;
use App\Services\ContenuService;
use App\Support\PresentationQuestion;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

/*
 * Annales côté élève (PLAN M6) : ce qu'il voit vient de CatalogueEleve (son
 * examen, sa série) ; la fiche reçoit un objet de contenu (versions
 * publiées) ; « Exercices par chapitre » filtre côté serveur ; une réponse
 * d'entraînement passe par la file, en mode entraînement.
 */

beforeEach(function () {
    Storage::fake('local');
    config(['annales.disque' => 'local']);
    $this->notion = notionDeTest();
    $this->autreChapitre = notionAilleurs('maths', '10e année', 'Les identités remarquables');
    $this->eleve = eleveAvecProfil('BEPC');
});

/** Une annale publiée (circuit réel), une question par notion donnée. */
function annalePubliee(Examen $examen, ?Serie $serie, Matiere $matiere, int $session, array $notions, bool $document = false): Sujet
{
    $sujets = app(SujetService::class);
    $contenu = app(ContenuService::class);
    $redacteur = User::factory()->avecRole(Role::Redacteur)->create();

    $sujet = $sujets->creer($redacteur, [
        'examen' => $examen, 'serie' => $serie, 'matiere' => $matiere, 'filiere' => Filiere::Generale,
        'session' => $session, 'type' => TypeSujet::Officiel, 'titre' => "{$matiere->nom} {$session}",
    ], $document ? ['chemin' => 'annales/doc.pdf', 'nom' => 'doc.pdf', 'type' => 'application/pdf', 'octets' => 4] : null);
    $partie = $sujets->ajouterPartie($sujet, $redacteur, 'Exercice 1', 5, blocsDeTest('Soit un triangle.'));

    foreach ($notions as $rang => $notion) {
        $question = $sujets->ajouterQuestion($partie, $redacteur, $notion, TypeQuestion::QcmUne);
        $contenu->enregistrerQuestion($question, $redacteur, [
            'enonce' => blocsDeTest("Question {$rang} sur {$notion->titre}"),
            'donnees' => ['options' => [['id' => 'a', 'texte' => 'Oui'], ['id' => 'b', 'texte' => 'Non']]],
            'attendue' => ['option' => 'a'],
            'indices' => [],
            'corrige' => [['titre' => '', 'blocs' => blocsDeTest('Parce que.')]],
            'difficulte' => 2,
        ], 0);
    }

    return $sujets->publier($sujets->soumettre($sujet->fresh(), $redacteur), User::factory()->avecRole(Role::Relecteur)->create())->fresh();
}

test('l\'élève voit les annales de son examen, pas celles des autres ; un brouillon ou un autre examen : 404', function () {
    $bepc = Examen::where('code', 'BEPC')->sole();
    $bac = Examen::where('code', 'BAC')->sole();
    $maths = Matiere::where('slug', 'maths')->sole();
    $siennes = annalePubliee($bepc, null, $maths, 2024, [$this->notion]);
    $autre = annalePubliee($bac, Serie::where('code', 'SE')->sole(), $maths, 2024, [$this->notion]);
    $brouillon = app(SujetService::class)->creer(User::factory()->avecRole(Role::Redacteur)->create(), [
        'examen' => $bepc, 'serie' => null, 'matiere' => $maths, 'filiere' => Filiere::Generale,
        'session' => 2020, 'type' => TypeSujet::Officiel, 'titre' => 'Brouillon',
    ]);

    $this->actingAs($this->eleve)->get(route('eleve.annales.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('eleve/annales')
            ->where('resume.sujets', 1)
            ->where('resume.exercices', 1)
            ->has('sujets.donnees', 1)
            ->where('sujets.donnees.0.uuid', $siennes->uuid)
            ->where('sujets.donnees.0.libelle_session', 'BEPC 2024'));

    $this->get(route('eleve.annales.show', $autre))->assertNotFound();
    $this->get(route('eleve.annales.show', $brouillon))->assertNotFound();
});

test('la fiche reçoit l\'objet de contenu : versions publiées, question retirée absente', function () {
    $sujet = annalePubliee(Examen::where('code', 'BEPC')->sole(), null, Matiere::where('slug', 'maths')->sole(), 2023, [$this->notion, $this->autreChapitre]);
    $retiree = $sujet->questions()->orderBy('ordre_sujet')->get()[1];
    app(ContenuService::class)->archiver($retiree, User::factory()->avecRole(Role::AdminContenu)->create());

    $this->actingAs($this->eleve)->get(route('eleve.annales.show', ['sujet' => $sujet, 'mode' => 'entrainement']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('mode', 'entrainement')
            ->where('sujet.type', 'sujet')
            ->where('sujet.version', 1)
            ->where('sujet.parties.0.titre', 'Exercice 1')
            ->where('sujet.parties.0.bareme', 5)
            ->has('sujet.parties.0.questions', 1)
            ->where('sujet.parties.0.questions.0.version', 1)
            ->where('sujet.document', null));
});

test('« Exercices par chapitre » ne montre que le chapitre demandé, recherche côté serveur', function () {
    $bepc = Examen::where('code', 'BEPC')->sole();
    $maths = Matiere::where('slug', 'maths')->sole();
    annalePubliee($bepc, null, $maths, 2024, [$this->notion, $this->autreChapitre]);
    annalePubliee($bepc, null, $maths, 2022, [$this->notion]);

    $chapitre = $this->notion->chapitre_id;

    $this->actingAs($this->eleve)->get(route('eleve.annales.index', ['vue' => 'exercices', 'chapitre' => $chapitre]))
        ->assertInertia(fn (Assert $page) => $page
            ->where('sujets', null)
            ->where('exercices.total', 2)
            // Du plus récent au plus ancien.
            ->where('exercices.donnees.0.libelle_session', 'BEPC 2024')
            ->where('exercices.donnees.1.libelle_session', 'BEPC 2022')
            ->has('chapitres', 2));

    $this->get(route('eleve.annales.index', ['vue' => 'exercices', 'recherche' => 'identités']))
        ->assertInertia(fn (Assert $page) => $page->where('exercices.total', 1));
});

test('une réponse d\'entraînement sur une annale passe par la file et compte', function () {
    $sujet = annalePubliee(Examen::where('code', 'BEPC')->sole(), null, Matiere::where('slug', 'maths')->sole(), 2024, [$this->notion]);
    $question = $sujet->questions()->sole();
    $jeton = appareilDe($this->eleve);

    envoyer($jeton, [geste($this->eleve, 'tentative.enregistrer', [
        'question' => $question->uuid, 'version' => 1, 'reponse' => ['option' => 'a'], 'seance' => null,
    ])])->assertJsonPath('resultats.0.verdict', 'acceptee');

    $tentative = Tentative::query()->sole();
    expect($tentative->mode)->toBe(ModeTentative::Entrainement)
        ->and($tentative->score)->toBe(100);

    $this->actingAs($this->eleve)->get(route('eleve.annales.show', $sujet))
        ->assertInertia(fn (Assert $page) => $page->where("scores.{$question->uuid}", 100));
});

test('le document original : l\'élève qui lit l\'annale l\'ouvre, les autres non ; hors du préfixe gardé hors ligne', function () {
    Storage::disk('local')->put('annales/doc.pdf', '%PDF');
    $sujet = annalePubliee(Examen::where('code', 'BEPC')->sole(), null, Matiere::where('slug', 'maths')->sole(), 2024, [$this->notion], document: true);

    $this->actingAs($this->eleve)->get(route('eleve.annales.document', $sujet))
        ->assertOk()
        ->assertHeader('Content-Type', 'application/pdf');

    $this->actingAs(eleveAvecProfil('BAC', 'SE'))->get(route('eleve.annales.document', $sujet))->assertNotFound();

    // Le service worker ne copie pas un PDF de plusieurs Mo : la règle de
    // la liste blanche (préfixe par segment, « $ » final borné).
    $segments = fn (string $chemin) => array_values(array_filter(explode('/', $chemin)));
    $cible = $segments((string) parse_url(route('eleve.annales.document', $sujet), PHP_URL_PATH));
    $garde = collect(config('hors_ligne.pages'))->contains(function (string $motif) use ($segments, $cible) {
        $borne = str_ends_with($motif, '$');
        $prefixe = $segments(rtrim($motif, '$'));

        return ($borne ? count($cible) === count($prefixe) : count($cible) >= count($prefixe))
            && array_slice($cible, 0, count($prefixe)) === $prefixe;
    });

    expect($garde)->toBeFalse();
});

test('une question d\'annale publiée dit d\'où elle vient, aussi dans une séance', function () {
    $sujet = annalePubliee(Examen::where('code', 'BEPC')->sole(), null, Matiere::where('slug', 'maths')->sole(), 2019, [$this->notion]);

    expect(PresentationQuestion::publiee($sujet->questions()->sole())['annale'])->toBe('BEPC 2019')
        ->and(PresentationQuestion::publiee(questionDeTest($this->notion))['annale'])->toBeNull();
});

test('sans annale, l\'élève a un état vide ; l\'écran ne casse pas', function () {
    $this->actingAs($this->eleve)->get(route('eleve.annales.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('resume.sujets', 0)->has('matieres', 0));
});

test('la notion d\'une annale d\'une autre classe n\'entre pas dans le catalogue de l\'élève', function () {
    $terminale = notionAilleurs('chimie', 'Terminale', 'Le pH');
    $bac = Examen::where('code', 'BAC')->sole();
    annalePubliee($bac, Serie::where('code', 'SE')->sole(), Matiere::where('slug', 'chimie')->sole(), 2024, [$terminale]);

    $this->actingAs($this->eleve)->get(route('eleve.annales.index'))
        ->assertInertia(fn (Assert $page) => $page->where('resume.sujets', 0)->where('resume.exercices', 0));
});
