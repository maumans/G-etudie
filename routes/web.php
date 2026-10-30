<?php

use App\Http\Controllers\Eleve\AccueilController as AccueilEleveController;
use App\Http\Controllers\VitrineController;
use App\Http\Middleware\SeulementEnDeveloppement;
use Illuminate\Support\Facades\Route;

// Vitrine (habillage public).
Route::get('/', VitrineController::class)->name('home');

// Catalogue du design system Ardoise : développement et tests seulement.
Route::inertia('dev/composants', 'dev/composants')
    ->middleware(SeulementEnDeveloppement::class)
    ->name('dev.composants');

// Entrées des trois espaces connectés (lot 0, étape 3). Les permissions
// (`can:`) arrivent avec les rôles à l'étape 5 : AccesParRoleTest les exigera.
Route::middleware('auth')->group(function () {
    Route::get('eleve', AccueilEleveController::class)->name('eleve.accueil');
    Route::inertia('contenu', 'contenu/accueil')->name('contenu.accueil');
    Route::inertia('console', 'console/accueil')->name('console.accueil');
});

require __DIR__.'/compte.php';
