<?php

use Inertia\Testing\AssertableInertia as Assert;

test('le catalogue des composants s\'affiche en développement', function () {
    $this->get(route('dev.composants'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('dev/composants'));
});

test('le catalogue des composants n\'existe pas en production', function () {
    app()->detectEnvironment(fn () => 'production');

    $this->get('/dev/composants')->assertNotFound();
});
