<?php

use App\Models\Examen;
use App\Models\Matiere;
use App\Support\Habillages;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Vite;

/*
 * Lot 8 — rendu serveur (SSR) de la vitrine : la page arrive construite,
 * l'illustration du héros s'affiche sans attendre React (critère Lighthouse),
 * et les moteurs comme WhatsApp lisent la page entière. Les espaces connectés
 * restent construits par le navigateur (hors ligne, HORS_LIGNE.md).
 *
 * Le processus Node est simulé (Http::fake) : phpunit.xml coupe le rendu
 * serveur, chaque test le rallume.
 */

const HTML_SERVEUR = '<div data-server-rendered="true" id="app"><h1>Construite par le serveur</h1></div>';

beforeEach(function () {
    $this->notion = notionDeTest();
    config([
        'inertia.ssr.enabled' => true,
        // Pas de bootstrap/ssr/ssr.js dans les tests : la simulation en tient lieu.
        'inertia.ssr.ensure_bundle_exists' => false,
    ]);
});

function processusNode(int $statut = 200): void
{
    Http::fake(['*' => $statut === 200
        ? Http::response(['head' => [], 'body' => HTML_SERVEUR])
        : Http::response(['error' => 'window is not defined', 'type' => 'browser-api'], $statut)]);
}

test('la vitrine est construite par le serveur : accueil, annales, sujet public', function () {
    processusNode();
    Storage::fake('local');
    $sujet = annalePubliee(
        Examen::where('code', 'BEPC')->sole(),
        null,
        Matiere::where('slug', 'maths')->sole(),
        2024,
        [$this->notion],
    );
    // Un sujet d'exemple est public (AnnalesPubliques), sans droits à saisir.
    $sujet->forceFill(['est_exemple' => true])->save();

    foreach (['/', '/sujets', "/sujets/{$sujet->slug}"] as $adresse) {
        $this->get($adresse)->assertOk()->assertSee(HTML_SERVEUR, false);
    }

    // Une seule requête par page : l'en-tête et le corps réutilisent le même rendu.
    Http::assertSentCount(3);
    Http::assertSent(fn (Request $requete) => $requete['component'] === 'vitrine/accueil');
});

test('les espaces connectés et la connexion ne passent jamais par le processus Node', function () {
    processusNode();

    $this->get('/login')->assertOk()->assertDontSee('data-server-rendered', false);
    $this->actingAs(eleveAvecProfil())->get('/eleve')->assertOk()->assertDontSee('data-server-rendered', false);

    Http::assertNothingSent();
    expect(Habillages::renduServeur('vitrine/accueil'))->toBeTrue()
        ->and(Habillages::renduServeur('eleve/accueil'))->toBeFalse()
        ->and(Habillages::renduServeur('auth/login'))->toBeFalse()
        ->and(Habillages::renduServeur('erreur'))->toBeFalse();
});

test('processus Node en échec ou injoignable : la vitrine est construite par le navigateur, sans erreur', function () {
    processusNode(500);
    $this->get('/')->assertOk()
        ->assertDontSee('data-server-rendered', false)
        ->assertSee('data-page="app"', false)
        // Page vide jusqu'au JavaScript : ses scripts ne sont pas différés.
        ->assertDontSee('<script id="scripts-differes">', false);

    Http::fake(fn () => throw new ConnectionException('Connexion refusée'));
    $this->get('/')->assertOk()->assertDontSee('data-server-rendered', false);
});

test('page construite par le serveur : scripts lancés après l\'affichage, absents de l\'en-tête Link', function () {
    processusNode();
    // Un manifeste Vite d'essai : les tests ne dépendent pas d'un build.
    $dossier = public_path('vite-essai');
    File::ensureDirectoryExists($dossier);
    $manifeste = [
        'resources/css/app.css' => ['file' => 'assets/app.css', 'src' => 'resources/css/app.css', 'isEntry' => true],
        'resources/js/app.tsx' => ['file' => 'assets/app.js', 'src' => 'resources/js/app.tsx', 'isEntry' => true, 'imports' => ['_react.js']],
        '_react.js' => ['file' => 'assets/react.js'],
    ];
    foreach (['pages/vitrine/accueil', 'layouts/vitrine-layout', 'pages/auth/connexion', 'layouts/connexion-layout'] as $fichier) {
        $manifeste["resources/js/{$fichier}.tsx"] = ['file' => 'assets/'.basename($fichier).'.js', 'src' => "resources/js/{$fichier}.tsx", 'imports' => ['_react.js']];
    }
    File::put("{$dossier}/manifest.json", json_encode($manifeste));
    $this->withVite();
    Vite::useBuildDirectory('vite-essai');

    try {
        $vitrine = $this->get('/')->assertOk();
        $html = (string) $vitrine->getContent();

        expect($html)->toContain('<script id="scripts-differes">')
            ->toContain('assets/app.css')
            // Les balises n'existent qu'en chaîne JSON : aucun script ni
            // préchargement que le navigateur découvrirait avant l'illustration.
            ->not->toContain('<script type="module"')
            ->not->toContain('rel="modulepreload"')
            ->toContain('assets\/app.js')
            ->toContain('assets\/accueil.js');
        expect($vitrine->headers->get('Link'))->toContain('app.css')->not->toContain('modulepreload');

        // Une page construite par le navigateur garde ses scripts d'emblée.
        $connexion = $this->get('/login')->assertOk();
        expect((string) $connexion->getContent())->toContain('<script type="module"')
            ->not->toContain('<script id="scripts-differes">');
        expect($connexion->headers->get('Link'))->toContain('modulepreload');
    } finally {
        File::deleteDirectory($dossier);
    }
});
