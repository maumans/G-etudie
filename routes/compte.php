<?php

use App\Enums\Permission;
use App\Http\Controllers\Compte\MonCompteController;
use App\Http\Controllers\Compte\RecuperationController;
use App\Http\Controllers\Compte\SecuriteController;
use App\Http\Controllers\Compte\VerificationNumeroController;
use Illuminate\Support\Facades\Route;

// Mot de passe oublié : code SMS au numéro vérifié du compte (D3).
Route::middleware('guest')->group(function () {
    Route::get('mot-de-passe-oublie', [RecuperationController::class, 'create'])
        ->name('compte.recuperation.create');
    Route::post('mot-de-passe-oublie', [RecuperationController::class, 'store'])
        ->middleware('throttle:10,1')
        ->name('compte.recuperation.store');
    Route::get('mot-de-passe-oublie/code', [RecuperationController::class, 'code'])
        ->name('compte.recuperation.code');
    Route::post('mot-de-passe-oublie/code', [RecuperationController::class, 'update'])
        ->middleware('throttle:10,1')
        ->name('compte.recuperation.update');
});

// « Mon compte » : chaque compte gère le sien. Ouvert à tout compte connecté,
// avec sa raison, dans AccesParRoleTest::OUVERTES_A_TOUS.
Route::middleware('auth')->prefix('compte')->name('compte.')->group(function () {
    Route::redirect('/', '/compte/profil')->name('accueil');

    Route::get('verification', [VerificationNumeroController::class, 'edit'])->name('verification.edit');
    Route::post('verification/code', [VerificationNumeroController::class, 'envoyer'])
        ->middleware('throttle:10,1')
        ->name('verification.envoyer');
    Route::post('verification', [VerificationNumeroController::class, 'confirmer'])
        ->middleware('throttle:10,1')
        ->name('verification.confirmer');

    Route::get('profil', [MonCompteController::class, 'profil'])->name('profil.edit');
    Route::patch('profil', [MonCompteController::class, 'mettreAJourProfil'])->name('profil.update');

    Route::get('mot-de-passe', [MonCompteController::class, 'motDePasse'])->name('mot-de-passe.edit');
    Route::put('mot-de-passe', [MonCompteController::class, 'changerMotDePasse'])
        ->middleware('throttle:6,1')
        ->name('mot-de-passe.update');

    Route::get('numero', [MonCompteController::class, 'numero'])->name('numero.edit');
    Route::post('numero/code', [MonCompteController::class, 'envoyerCodeNumero'])
        ->middleware('throttle:6,1')
        ->name('numero.envoyer');
    Route::put('numero', [MonCompteController::class, 'changerNumero'])
        ->middleware('throttle:10,1')
        ->name('numero.update');
    Route::delete('numero/en-attente', [MonCompteController::class, 'annulerNumero'])->name('numero.annuler');

    Route::get('affichage', [MonCompteController::class, 'affichage'])->name('affichage.edit');

    // Double authentification : personnel seulement (DA4).
    Route::get('securite', [SecuriteController::class, 'edit'])
        ->can(Permission::DoubleAuthentification)
        ->middleware('password.confirm')
        ->name('securite.edit');

    Route::delete('/', [MonCompteController::class, 'supprimer'])
        ->middleware('throttle:6,1')
        ->name('destroy');
});
