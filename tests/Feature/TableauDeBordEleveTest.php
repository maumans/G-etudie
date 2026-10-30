<?php

use App\Models\User;
use App\Support\Demonstration\TableauDeBordExemple;
use Carbon\CarbonImmutable;
use Inertia\Testing\AssertableInertia as Assert;

test('l\'accueil élève livre le tableau de bord, marqué comme exemple', function () {
    $this->actingAs(User::factory()->create())
        ->get('/eleve')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('eleve/accueil')
            ->where('tableau.est_exemple', true)
            ->has('tableau.jauge.matieres', 5)
            ->has('tableau.serie.semaine', 7)
            ->has('tableau.progression', 3)
            ->has('tableau.reprendre', 3)
            ->has('tableau.reussites', 2)
            ->where('tableau.seance.duree_minutes', 15));
});

test('un visiteur ne voit pas le tableau de bord', function () {
    $this->get('/eleve')->assertRedirect(route('login'));
});

test('la semaine de la série suit le jour courant', function () {
    // Jeudi 29 octobre 2026.
    $semaine = TableauDeBordExemple::donnees(CarbonImmutable::parse('2026-10-29 10:00'))['serie']['semaine'];

    expect(array_column($semaine, 'jour'))->toBe(['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'])
        ->and(array_column($semaine, 'etat'))->toBe(['fait', 'fait', 'grace', 'en_cours', 'a_venir', 'a_venir', 'a_venir']);
});

test('le lundi, rien n\'est encore fait ni rattrapé', function () {
    $semaine = TableauDeBordExemple::donnees(CarbonImmutable::parse('2026-10-26 08:00'))['serie']['semaine'];

    expect(array_column($semaine, 'etat'))->toBe(['en_cours', 'a_venir', 'a_venir', 'a_venir', 'a_venir', 'a_venir', 'a_venir']);
});

test('les matières de l\'exemple sont des clés connues de l\'interface', function () {
    // resources/js/lib/matieres.ts : une clé inconnue casserait l'affichage.
    $connues = ['maths', 'physique', 'chimie', 'biologie', 'francais', 'anglais', 'histoire', 'philosophie', 'economie', 'culture'];
    $donnees = TableauDeBordExemple::donnees();

    $cles = [
        ...array_column($donnees['jauge']['matieres'], 'cle'),
        ...$donnees['seance']['matieres'],
        ...array_column($donnees['progression'], 'cle'),
        ...array_column($donnees['reprendre'], 'cle'),
    ];

    expect(array_diff($cles, $connues))->toBe([]);
});
