<?php

use App\Enums\Permission;
use App\Http\Controllers\Eleve\AccueilController;
use App\Http\Controllers\Eleve\CoursController;
use App\Http\Controllers\Eleve\LeconController;
use App\Http\Controllers\Eleve\ParcoursAccueilController;
use App\Http\Controllers\Eleve\SeanceController;
use App\Http\Middleware\ProfilEleveRequis;
use Illuminate\Support\Facades\Route;

// Espace élève (lot 2). Toutes les routes portent `can:espace.eleve`
// (AccesParRoleTest) ; ce que l'élève voit, c'est App\Support\CatalogueEleve.
// Les gestes (réponses, progression, fin de séance) ne passent pas par ici
// mais par la file d'opérations (/sync/operations, HORS_LIGNE.md A.6).
Route::middleware(['auth', 'can:'.Permission::EspaceEleve->value])
    ->prefix('eleve')
    ->name('eleve.')
    ->group(function () {
        // Sans profil, l'accueil envoie lui-même au parcours.
        Route::get('/', AccueilController::class)->name('accueil');
        Route::get('bienvenue', [ParcoursAccueilController::class, 'edit'])->name('bienvenue');
        Route::put('bienvenue', [ParcoursAccueilController::class, 'update'])->name('bienvenue.update');

        Route::middleware(ProfilEleveRequis::class)->group(function () {
            Route::get('cours', [CoursController::class, 'index'])->name('cours');
            Route::get('cours/{matiere:slug}', [CoursController::class, 'matiere'])->name('cours.matiere');
            Route::get('lecons/{lecon}', [LeconController::class, 'show'])->name('lecons.show');
            Route::get('chapitres/{chapitre}/fiche', [LeconController::class, 'fiche'])->name('chapitres.fiche');

            Route::post('seance', [SeanceController::class, 'commencer'])->name('seance.commencer');
            Route::get('seances/{seance}', [SeanceController::class, 'show'])->name('seances.show');
        });
    });
