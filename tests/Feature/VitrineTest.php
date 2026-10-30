<?php

use App\Support\ImagesVitrine;
use Inertia\Testing\AssertableInertia as Assert;

test('sans photo déposée, la vitrine n\'en annonce aucune', function () {
    config(['vitrine.photo_heros' => 'images/vitrine/absente.webp']);

    $this->get('/')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('vitrine/accueil')
            ->where('photoHeros', null));
});

test('une photo déposée dans public/ est livrée à la vitrine', function () {
    // favicon.svg existe toujours dans public/ : il tient lieu de photo.
    config(['vitrine.photo_heros' => 'favicon.svg']);

    $this->get('/')
        ->assertInertia(fn (Assert $page) => $page
            ->where('photoHeros', asset('favicon.svg')));
});

test('un chemin vide ou un dossier ne passe pas pour une photo', function (string $chemin) {
    config(['vitrine.photo_heros' => $chemin]);

    $this->get('/')
        ->assertInertia(fn (Assert $page) => $page->where('photoHeros', null));
})->with(['', 'images']);

test('chaque emplacement reçoit son illustration par défaut', function () {
    $this->get('/')
        ->assertInertia(fn (Assert $page) => $page
            ->where('illustrations.heros', asset('images/vitrine/defaut/heros.svg'))
            ->where('illustrations.cee', asset('images/vitrine/defaut/cee.svg'))
            ->where('illustrations.bepc', asset('images/vitrine/defaut/bepc.svg'))
            ->where('illustrations.bac', asset('images/vitrine/defaut/bac.svg'))
            ->where('illustrations.soir', asset('images/vitrine/defaut/soir.svg')));

    foreach (ImagesVitrine::EMPLACEMENTS as $emplacement) {
        expect(public_path("images/vitrine/defaut/{$emplacement}.svg"))->toBeFile();
    }
});

test('une illustration remplacée est livrée à sa place', function () {
    config(['vitrine.illustrations.bac' => 'favicon.svg']);

    $this->get('/')
        ->assertInertia(fn (Assert $page) => $page
            ->where('illustrations.bac', asset('favicon.svg'))
            ->where('illustrations.cee', asset('images/vitrine/defaut/cee.svg')));
});

test('une illustration introuvable retombe sur le dessin par défaut', function (?string $chemin) {
    config(['vitrine.illustrations.heros' => $chemin]);

    $this->get('/')
        ->assertInertia(fn (Assert $page) => $page
            ->where('illustrations.heros', asset('images/vitrine/defaut/heros.svg')));
})->with(['images/vitrine/absente.webp', '', 'images', null]);
