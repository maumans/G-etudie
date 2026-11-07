<?php

use App\Enums\TypeQuestion;
use App\Models\Examen;
use App\Support\Habillages;
use App\Support\QuestionDemonstration;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;

/*
 * Lot 8 — la vitrine finale (PLAN M1) : question jouable sans compte,
 * compte à rebours sur les dates **saisies**, tarifs en GNF configurables,
 * partenaires réels seulement, balises de référencement dans le HTML.
 */

beforeEach(function () {
    // Le référentiel (examens) vient avec la première notion.
    $this->notion = notionDeTest();
});

test('le compte à rebours ne montre que les sessions saisies et à venir', function () {
    Carbon::setTestNow('2026-11-07 10:00:00');
    Examen::where('code', 'BEPC')->sole()->update(['date_prochaine_session' => '2027-06-22']);
    Examen::where('code', 'CEE')->sole()->update(['date_prochaine_session' => '2026-06-01']);

    $this->get('/')->assertInertia(fn (Assert $page) => $page
        ->component('vitrine/accueil')
        ->has('compteARebours', 1)
        ->where('compteARebours.0.examen', 'BEPC')
        ->where('compteARebours.0.date', '2027-06-22'));

    Carbon::setTestNow();
});

test('sans date saisie, aucun compte à rebours (jamais de date devinée)', function () {
    $this->get('/')->assertInertia(fn (Assert $page) => $page->has('compteARebours', 0));
});

test('la question jouable est la question d\'exemple, marquée, tant que l\'équipe n\'en a pas choisi', function () {
    config(['vitrine.question_demo' => null]);

    $this->get('/')->assertInertia(fn (Assert $page) => $page
        ->where('questionDemo.uuid', QuestionDemonstration::UUID_EXEMPLE)
        ->where('questionDemo.est_exemple', true)
        ->where('questionDemo.type', 'qcm_une')
        ->has('questionDemo.corrige', 3));
});

test('la question choisie par l\'équipe la remplace si elle est publiée', function () {
    $question = questionPubliee(
        $this->notion,
        TypeQuestion::QcmUne,
        ['options' => [['id' => 'a', 'texte' => '3'], ['id' => 'b', 'texte' => '4']]],
        ['option' => 'b'],
    );

    config(['vitrine.question_demo' => $question->uuid]);
    $this->get('/')->assertInertia(fn (Assert $page) => $page->where('questionDemo.uuid', $question->uuid));

    $question->update(['statut' => 'archive']);
    $this->get('/')->assertInertia(fn (Assert $page) => $page->where('questionDemo.uuid', QuestionDemonstration::UUID_EXEMPLE));
});

test('les tarifs viennent de la configuration, en GNF entiers', function () {
    config(['vitrine.tarifs.formules.0.prix_gnf' => 12000]);

    $this->get('/')->assertInertia(fn (Assert $page) => $page
        ->where('tarifs.formules.0.cle', 'mensuel')
        ->where('tarifs.formules.0.prix_gnf', 12000)
        ->where('tarifs.formules.1.cle', 'annee')
        ->where('tarifs.formules.1.mois', 10));
});

test('un partenaire n\'apparaît qu\'avec un nom et un logo réellement déposé', function () {
    config(['vitrine.partenaires' => [
        ['nom' => 'Lycée réel', 'logo' => 'favicon.svg', 'url' => 'https://exemple.gn'],
        ['nom' => 'Logo absent', 'logo' => 'images/partenaires/absent.svg'],
        ['nom' => '', 'logo' => 'favicon.svg'],
    ]]);

    $this->get('/')->assertInertia(fn (Assert $page) => $page
        ->has('partenaires', 1)
        ->where('partenaires.0.nom', 'Lycée réel')
        ->where('partenaires.0.logo', asset('favicon.svg')));
});

test('sans partenaire configuré, la liste est vide', function () {
    $this->get('/')->assertInertia(fn (Assert $page) => $page->has('partenaires', 0));
});

test('l\'accueil porte ses balises de référencement et précharge l\'illustration du héros', function () {
    $this->get('/')
        ->assertOk()
        ->assertSee('<meta name="description" content="Cours, annales corrigées', false)
        ->assertSee('<link rel="canonical" href="'.url('/').'">', false)
        ->assertSee('<meta property="og:image" content="'.route('partage.image.generale').'">', false)
        ->assertSee('<link rel="preload" as="image" href="'.asset('images/vitrine/defaut/heros.svg').'" fetchpriority="high">', false)
        ->assertSee('"@type":"WebSite"', false)
        ->assertSee('<title>Préparer le CEE, le BEPC et le Baccalauréat · ', false);
});

test('une page sans balises dédiées garde la description générale, sans balise robots', function () {
    $this->get('/login')
        ->assertOk()
        ->assertSee('<meta name="description"', false)
        ->assertDontSee('og:title', false);
});

test('le document précharge l\'habillage de la page (même règle que lib/habillages.ts)', function () {
    $fixture = json_decode((string) file_get_contents(base_path('tests/fixtures/habillages.json')), true);

    foreach ($fixture['exemples'] as $page => $habillage) {
        expect(Habillages::de($page))->toBe($habillage, $page);
    }

    expect(Habillages::fichiersVite('vitrine/accueil'))->toContain('resources/js/layouts/vitrine-layout.tsx')
        ->and(Habillages::fichiersVite('eleve/seance'))->toHaveCount(3);

    foreach (['vitrine', 'eleve', 'contenu', 'console', 'connexion', 'compte'] as $habillage) {
        expect(resource_path("js/layouts/{$habillage}-layout.tsx"))->toBeFile();
    }
});
