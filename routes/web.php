<?php

use App\Enums\Permission;
use App\Http\Controllers\AiguillageController;
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

// Entrées des trois espaces connectés : chaque route porte sa permission
// (AccesParRoleTest échoue sur toute route authentifiée sans `can:`).
Route::middleware('auth')->group(function () {
    // Après connexion, chaque compte est aiguillé vers son espace (fortify.home).
    Route::get('accueil', AiguillageController::class)->name('accueil');

    Route::get('eleve', AccueilEleveController::class)
        ->can(Permission::EspaceEleve)
        ->name('eleve.accueil');
    Route::inertia('contenu', 'contenu/accueil')
        ->can(Permission::EspaceContenu)
        ->name('contenu.accueil');
    Route::inertia('console', 'console/accueil')
        ->can(Permission::EspaceConsole)
        ->name('console.accueil');
});

require __DIR__.'/compte.php';
