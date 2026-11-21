<?php

use App\Enums\Role;
use App\Models\User;

/*
| On dit « sujet », plus « annale » (2026-11-21) : les anciennes adresses
| mènent aux nouvelles, paramètres compris, et la page d'arrivée garde ses
| contrôles (connexion, permission).
*/

test('les anciennes adresses mènent aux nouvelles, paramètres compris', function (string $ancienne, string $nouvelle) {
    $this->get($ancienne)->assertStatus(301)->assertRedirect($nouvelle);
})->with([
    'liste élève' => ['/eleve/annales', '/eleve/sujets'],
    'liste élève filtrée' => ['/eleve/annales?vue=exercices&matiere=mathematiques', '/eleve/sujets?matiere=mathematiques&vue=exercices'],
    'fiche élève, examen blanc' => ['/eleve/annales/0193a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b?mode=examen', '/eleve/sujets/0193a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b?mode=examen'],
    'document élève' => ['/eleve/documents/annales/abc', '/eleve/documents/sujets/abc'],
    'back-office' => ['/contenu/annales', '/contenu/sujets'],
    'import' => ['/contenu/annales/importer', '/contenu/sujets/importer'],
    'relecture' => ['/contenu/relecture/annales', '/contenu/relecture/sujets'],
]);

test('la redirection ne donne aucun accès : la page d\'arrivée garde ses contrôles', function () {
    $this->get('/eleve/annales')->assertRedirect('/eleve/sujets');
    $this->get('/eleve/sujets')->assertRedirect('/login');

    $parent = User::factory()->avecRole(Role::Parent)->create();
    $this->actingAs($parent)->get('/contenu/annales')->assertRedirect('/contenu/sujets');
    $this->actingAs($parent)->get('/contenu/sujets')->assertForbidden();
});

test('les nouvelles adresses s\'ouvrent', function () {
    $eleve = eleveAvecProfil('BEPC');
    $this->actingAs($eleve)->get('/eleve/sujets')->assertOk();

    $redacteur = User::factory()->avecRole(Role::Redacteur)->create();
    $this->actingAs($redacteur)->get('/contenu/sujets')->assertOk();
    $this->actingAs($redacteur)->get('/contenu/sujets/importer')->assertOk();
});
