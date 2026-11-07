<?php

use App\Enums\Filiere;
use App\Enums\Role;
use App\Enums\TypeQuestion;
use App\Enums\TypeSujet;
use App\Models\Examen;
use App\Models\Matiere;
use App\Models\Serie;
use App\Models\Sujet;
use App\Models\User;
use App\Services\Annales\SujetService;
use App\Services\ContenuService;
use App\Support\AnnalesPubliques;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

/*
 * Lot 8 — annales publiques (PLAN M1 « SEO »), décision D5 de Maurice du
 * 2026-11-06 : seule une annale **publiée dont l'autorisation de publier est
 * saisie** est publique ; un sujet maison aussi ; un sujet d'exemple est
 * visible mais jamais indexé. Le corrigé ne sort jamais sans compte.
 */

beforeEach(function () {
    Storage::fake('local');
    // Le référentiel (examens, matières) vient avec la première notion.
    notionDeTest();
});

function bepcMaths(int $session = 2021, array $champs = []): Sujet
{
    $sujet = annalePubliee(
        Examen::where('code', 'BEPC')->sole(),
        null,
        Matiere::where('slug', 'maths')->sole(),
        $session,
        [notionDeTest()],
    );

    if ($champs !== []) {
        $sujet->forceFill($champs)->save();
    }

    return $sujet->fresh();
}

test('chaque sujet reçoit une adresse lisible, unique, qui ne change plus', function () {
    $premier = bepcMaths(2021);
    $second = bepcMaths(2021);
    $bac = annalePubliee(
        Examen::where('code', 'BAC')->sole(),
        Serie::where('code', 'SE')->sole(),
        Matiere::where('slug', 'maths')->sole(),
        2019,
        [notionDeTest()],
    );

    expect($premier->slug)->toBe('bepc-mathematiques-2021')
        ->and($second->slug)->toBe('bepc-mathematiques-2021-2')
        ->and($bac->slug)->toBe('bac-se-mathematiques-2019');

    $premier->update(['session' => 2022]);
    expect($premier->fresh()->slug)->toBe('bepc-mathematiques-2021');
});

test('une annale officielle sans autorisation de publier reste fermée (D5)', function () {
    $sujet = bepcMaths();

    expect($sujet->droits)->toBeNull();
    $this->get("/sujets/{$sujet->slug}")->assertNotFound();
    $this->get("/partage/sujets/{$sujet->slug}.png")->assertNotFound();
    $this->get('/sujets')->assertInertia(fn (Assert $page) => $page->where('sujets.total', 0));
});

test('le rédacteur saisit l\'autorisation dans le back-office : l\'annale devient publique et indexable', function () {
    $sujets = app(SujetService::class);
    $redacteur = User::factory()->avecRole(Role::Redacteur)->create();
    $sujet = $sujets->creer($redacteur, [
        'examen' => Examen::where('code', 'BEPC')->sole(), 'serie' => null,
        'matiere' => Matiere::where('slug', 'maths')->sole(), 'filiere' => Filiere::Generale,
        'session' => 2018, 'type' => TypeSujet::Officiel, 'titre' => 'Mathématiques 2018',
    ]);

    // La porte d'entrée réelle : le formulaire « Renseignements » de l'annale.
    $this->actingAs($redacteur)
        ->put(route('contenu.annales.update', $sujet), [
            'titre' => 'Mathématiques 2018', 'session' => 2018, 'duree_minutes' => null,
            'coefficient' => null, 'droits' => 'Convention DGECS n° 12/2026', 'revision' => $sujet->revision,
        ])
        ->assertRedirect();

    expect($sujet->fresh()->droits)->toBe('Convention DGECS n° 12/2026');

    $partie = $sujets->ajouterPartie($sujet->fresh(), $redacteur, 'Exercice 1', 5, blocsDeTest('Soit un triangle.'));
    $question = $sujets->ajouterQuestion($partie, $redacteur, notionDeTest(), TypeQuestion::QcmUne);
    app(ContenuService::class)->enregistrerQuestion($question, $redacteur, [
        'enonce' => blocsDeTest('Quelle est la bonne réponse ?'),
        'donnees' => ['options' => [['id' => 'a', 'texte' => 'Oui'], ['id' => 'b', 'texte' => 'Non']]],
        'attendue' => ['option' => 'a'], 'indices' => [], 'difficulte' => 2,
        'corrige' => [['titre' => 'Étape', 'blocs' => blocsDeTest('Parce que.')]],
    ], 0);
    $sujets->publier($sujets->soumettre($sujet->fresh(), $redacteur), User::factory()->avecRole(Role::Relecteur)->create());

    auth()->logout();

    $this->get('/sujets/bepc-mathematiques-2018')
        ->assertOk()
        ->assertSee('<meta name="robots" content="index, follow, max-image-preview:large">', false)
        ->assertInertia(fn (Assert $page) => $page
            ->component('vitrine/sujet')
            ->where('sujet.slug', 'bepc-mathematiques-2018')
            ->where('sujet.parties.0.questions.0.corrige_etapes', 1));

    $this->get('/sitemap.xml')->assertOk()->assertSee(route('vitrine.sujets.show', 'bepc-mathematiques-2018'), false);
});

test('la page publique ne livre ni la réponse, ni les indices, ni le corrigé', function () {
    $sujet = bepcMaths(champs: ['droits' => 'Convention n° 1']);

    $reponse = $this->get("/sujets/{$sujet->slug}")->assertOk();
    $page = json_decode((string) json_encode($reponse->viewData('page')['props']['sujet']), true);

    $question = $page['parties'][0]['questions'][0];

    expect($question)->toHaveKeys(['uuid', 'type', 'enonce', 'donnees', 'corrige_etapes'])
        ->and($question)->not->toHaveKeys(['attendue', 'indices', 'corrige'])
        ->and($page)->not->toHaveKey('document');

    // Et rien dans le document HTML entier (props sérialisées comprises).
    expect($reponse->getContent())
        ->not->toContain('Parce que.')
        ->not->toContain('"attendue"')
        ->not->toContain('"indices"');
});

test('le barème d\'une question ouverte ne sort pas non plus', function () {
    $presentee = (new ReflectionMethod(AnnalesPubliques::class, 'enonceSeul'))->invoke(null, [
        'uuid' => 'u', 'type' => 'ouverte', 'enonce' => blocsDeTest('Rédige.'),
        'donnees' => (object) ['bareme' => [['id' => 'c1', 'critere' => 'Cite Pythagore', 'points' => 2]]],
        'attendue' => (object) [], 'indices' => [], 'corrige' => [],
    ]);

    expect((array) $presentee['donnees'])->not->toHaveKey('bareme');
});

test('un sujet d\'exemple est visible avec son bandeau mais jamais indexé ni dans le plan du site', function () {
    $sujet = bepcMaths(champs: ['est_exemple' => true]);

    $this->get("/sujets/{$sujet->slug}")
        ->assertOk()
        ->assertSee('<meta name="robots" content="noindex, follow">', false)
        ->assertInertia(fn (Assert $page) => $page->where('sujet.est_exemple', true));

    $this->get('/sujets')->assertSee('noindex', false);
    $this->get('/sitemap.xml')->assertDontSee($sujet->slug);
});

test('un sujet maison est public ; un brouillon ou une annale retirée ne l\'est pas', function () {
    $maison = bepcMaths(2020, ['type' => TypeSujet::BlancMaison->value]);
    $retire = bepcMaths(2019, ['droits' => 'Convention n° 2', 'statut' => 'archive']);

    $this->get("/sujets/{$maison->slug}")->assertOk();
    $this->get("/sujets/{$retire->slug}")->assertNotFound();
    $this->get('/sujets/inexistant-2020')->assertNotFound();
});

test('les balises de partage WhatsApp sont dans le HTML du serveur', function () {
    $sujet = bepcMaths(champs: ['droits' => 'Convention n° 3']);

    $this->get("/sujets/{$sujet->slug}")
        ->assertSee('<meta property="og:title" content="Sujet de Mathématiques, BEPC 2021">', false)
        ->assertSee('<meta property="og:image" content="'.route('partage.image.sujet', $sujet->slug).'">', false)
        ->assertSee('<link rel="canonical" href="'.route('vitrine.sujets.show', $sujet->slug).'">', false)
        ->assertSee('"@type":"LearningResource"', false)
        ->assertSee('<title>Sujet de Mathématiques, BEPC 2021 · ', false);
});

test('l\'image de partage d\'un sujet public est un PNG 1200 × 630, redessiné seulement si son texte change', function () {
    $sujet = bepcMaths(champs: ['droits' => 'Convention n° 4']);

    $reponse = $this->get("/partage/sujets/{$sujet->slug}.png")->assertOk()->assertHeader('Content-Type', 'image/png');
    $chemin = $reponse->baseResponse->getFile()->getPathname();
    [$largeur, $hauteur] = getimagesize($chemin);
    $date = filemtime($chemin);

    expect([$largeur, $hauteur])->toBe([1200, 630]);

    $this->get("/partage/sujets/{$sujet->slug}.png")->assertOk();
    clearstatcache();
    expect(filemtime($chemin))->toBe($date);

    $this->get('/partage/n-karamogo.png')->assertOk()->assertHeader('Content-Type', 'image/png');
});

test('la liste filtre par examen et par matière, côté serveur', function () {
    bepcMaths(2021, ['droits' => 'Convention n° 5']);
    annalePubliee(Examen::where('code', 'BAC')->sole(), Serie::where('code', 'SM')->sole(), Matiere::where('slug', 'maths')->sole(), 2019, [notionDeTest()])
        ->forceFill(['droits' => 'Convention n° 6'])->save();

    $this->get('/sujets')->assertInertia(fn (Assert $page) => $page->where('sujets.total', 2));
    $this->get('/sujets?examen=bac-sm')->assertInertia(fn (Assert $page) => $page
        ->where('filtres.examen', 'bac-sm')
        ->where('sujets.total', 1)
        ->where('sujets.donnees.0.slug', 'bac-sm-mathematiques-2019'));
    $this->get('/sujets?examen=bac-se')->assertInertia(fn (Assert $page) => $page->where('sujets.total', 0));
    $this->get('/sujets?examen=inconnu')->assertInertia(fn (Assert $page) => $page->where('filtres.examen', null)->where('sujets.total', 2));
});

test('robots.txt ferme les espaces connectés et annonce le plan du site ; une préproduction ferme tout', function () {
    $this->get('/robots.txt')
        ->assertOk()
        ->assertSee('Disallow: /eleve')
        ->assertSee('Disallow: /contenu')
        ->assertDontSee("Disallow: /\n", false)
        ->assertSee('Sitemap: '.route('plan-site'));

    config(['vitrine.indexer' => false]);

    $this->get('/robots.txt')->assertSee("Disallow: /\n", false);
    $this->get('/')->assertSee('<meta name="robots" content="noindex, follow">', false);
});
