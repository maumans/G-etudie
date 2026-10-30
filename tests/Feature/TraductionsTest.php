<?php

use Illuminate\Support\Facades\Validator;

test('l\'application parle français', function () {
    expect(app()->getLocale())->toBe('fr');
});

test('les messages de validation sont en français, avec des noms de champs lisibles', function () {
    $validateur = Validator::make(
        ['telephone' => '', 'password' => 'court'],
        ['telephone' => 'required', 'password' => 'min:8'],
    );

    expect($validateur->errors()->first('telephone'))->toBe('Le champ numéro de téléphone est obligatoire.')
        ->and($validateur->errors()->first('password'))->toBe('Le champ mot de passe doit contenir au moins 8 caractères.');
});

test('chaque règle de validation de Laravel a sa traduction française', function () {
    $anglais = require base_path('vendor/laravel/framework/src/Illuminate/Translation/lang/en/validation.php');
    $francais = require lang_path('fr/validation.php');

    $manquantes = array_diff(array_keys($anglais), array_keys($francais));

    expect($manquantes)->toBe([]);
});
