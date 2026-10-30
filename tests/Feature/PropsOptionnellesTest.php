<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Tests\Concerns\VerifiePropsOptionnelles;

uses(VerifiePropsOptionnelles::class);

/*
 * Vérifie l'outil lui-même sur une route de test : chaque future prop
 * optionnelle passera par verifierPropOptionnelle().
 */
beforeEach(function () {
    $this->evaluations = 0;

    Route::middleware('web')->get('/test/prop-optionnelle', function () {
        return Inertia::render('dev/composants', [
            'legere' => 'toujours là',
            'lourde' => Inertia::optional(function () {
                $this->evaluations++;

                return ['séances' => 12];
            }),
        ]);
    });
});

test('une prop optionnelle n\'est ni livrée ni évaluée au chargement complet, et arrive sur rechargement partiel', function () {
    $partiel = $this->verifierPropOptionnelle('/test/prop-optionnelle', 'dev/composants', 'lourde');

    expect($this->evaluations)->toBe(1);
    expect($partiel->json('props.lourde'))->toBe(['séances' => 12]);
});

test('le chargement complet n\'évalue pas la prop optionnelle', function () {
    $this->get('/test/prop-optionnelle', $this->entetesInertia())
        ->assertOk()
        ->assertJsonPath('props.legere', 'toujours là');

    expect($this->evaluations)->toBe(0);
});
