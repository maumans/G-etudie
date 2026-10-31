<?php

use App\Enums\EtatLecon;
use App\Http\Middleware\HandleInertiaRequests;
use App\Services\ProgressionService;
use Carbon\CarbonImmutable;
use Inertia\Testing\AssertableInertia as Assert;

/*
 * Les écrans des cours, par leurs routes réelles (CLAUDE.md § 4 : passer par
 * la porte d'entrée).
 */

/** @return array<string, mixed> */
function blocsAvecARetenir(string $retenir): array
{
    return ['type' => 'doc', 'content' => [
        ['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'Un paragraphe.']]],
        ['type' => 'encadre', 'attrs' => ['genre' => 'a_retenir'], 'content' => [
            ['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => $retenir]]],
        ]],
    ]];
}

test('« Cours » liste les matières de l\'examen avec leurs leçons comprises', function () {
    $eleve = eleveAvecProfil('BEPC');
    $lecon = leconPubliee(notionDeTest());
    leconPubliee(notionDeTest('La réciproque'), 'La réciproque');
    app(ProgressionService::class)->lecon($eleve, $lecon, EtatLecon::Comprise, 100, CarbonImmutable::now());

    $this->actingAs($eleve)->get(route('eleve.cours'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('eleve/cours')
            ->where('examen', 'BEPC')
            ->has('matieres', 4)
            ->where('matieres.0.slug', 'maths')
            ->where('matieres.0.phare', true)
            ->where('matieres.0.lecons', 2)
            ->where('matieres.0.lecons_comprises', 1)
            ->where('matieres.0.maitrise', 0));
});

test('une matière montre chapitres, notions, et l\'état de chaque leçon', function () {
    $eleve = eleveAvecProfil('BEPC');
    $lecon = leconPubliee(notionDeTest());
    notionDeTest('Notion sans leçon')->update(['ordre' => 2]);
    app(ProgressionService::class)->lecon($eleve, $lecon, false, 50, CarbonImmutable::now());

    $this->actingAs($eleve)->get(route('eleve.cours.matiere', 'maths'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('eleve/matiere')
            ->where('matiere.cle', 'maths')
            ->has('chapitres', 1)
            ->has('chapitres.0.notions', 2)
            ->where('chapitres.0.notions.0.lecons.0.uuid', $lecon->uuid)
            ->where('chapitres.0.notions.0.lecons.0.position', 50)
            ->where('chapitres.0.notions.0.lecons.0.etat', null)
            ->where('chapitres.0.notions.1.lecons', []));
});

test('une leçon livre son objet de contenu, son contexte et la progression de l\'élève', function () {
    $eleve = eleveAvecProfil('BEPC');
    $premiere = leconPubliee(notionDeTest(), 'Pythagore');
    $seconde = leconPubliee(notionDeTest('La réciproque'), 'La réciproque');
    // Ordre des notions : celui du programme.
    $seconde->notion->update(['ordre' => 2]);

    $this->actingAs($eleve)->get(route('eleve.lecons.show', $seconde))
        ->assertInertia(fn (Assert $page) => $page
            ->component('eleve/lecon')
            ->where('lecon.type', 'lecon')
            ->where('lecon.uuid', $seconde->uuid)
            ->where('lecon.version', 1)
            ->where('lecon.blocs', blocsDeTest())
            ->where('lecon.minutes', 1)
            ->where('contexte.matiere.slug', 'maths')
            ->where('contexte.rang', 2)
            ->where('contexte.total', 2)
            ->where('contexte.precedente.uuid', $premiere->uuid)
            ->where('contexte.suivante', null)
            ->where('progression', ['etat' => null, 'position' => 0]));
});

test('une leçon de texte pèse moins de 50 Ko (PLAN § 9)', function () {
    $eleve = eleveAvecProfil('BEPC');
    $texte = str_repeat('Une phrase de leçon, assez longue pour peser. ', 40);
    $blocs = ['type' => 'doc', 'content' => array_fill(0, 20, ['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => $texte]]])];
    $lecon = leconPubliee(notionDeTest(), 'Leçon longue', $blocs);

    // Visite Inertia (ce que l'appareil télécharge en naviguant).
    $reponse = $this->actingAs($eleve)->withHeaders([
        'X-Inertia' => 'true',
        'X-Inertia-Version' => app(HandleInertiaRequests::class)->version(request()) ?? '',
    ])->get(route('eleve.lecons.show', $lecon));

    $reponse->assertOk();
    expect(strlen((string) $reponse->getContent()))->toBeGreaterThan(30_000)->toBeLessThan(50_000);
});

test('la fiche de révision livre les leçons du chapitre et leurs « À retenir »', function () {
    $eleve = eleveAvecProfil('BEPC');
    $lecon = leconPubliee(notionDeTest(), 'Pythagore', blocsAvecARetenir('Le carré de l\'hypoténuse.'));

    $this->actingAs($eleve)->get(route('eleve.chapitres.fiche', $lecon->notion->chapitre_id))
        ->assertInertia(fn (Assert $page) => $page
            ->component('eleve/fiche')
            ->where('chapitre.titre', 'Géométrie du triangle')
            ->has('lecons', 1)
            ->where('lecons.0.blocs.content.1.attrs.genre', 'a_retenir'));
});

test('un visiteur est renvoyé à la connexion', function () {
    $this->get(route('eleve.cours'))->assertRedirect(route('login'));
});
