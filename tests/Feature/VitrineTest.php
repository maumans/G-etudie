<?php

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
