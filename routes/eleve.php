<?php

use App\Enums\Permission;
use App\Http\Controllers\Eleve\AccueilController;
use App\Http\Controllers\Eleve\AnnaleController;
use App\Http\Controllers\Eleve\CoursController;
use App\Http\Controllers\Eleve\ExamenBlancController;
use App\Http\Controllers\Eleve\LeconController;
use App\Http\Controllers\Eleve\ParcoursAccueilController;
use App\Http\Controllers\Eleve\SeanceController;
use App\Http\Controllers\Eleve\SignalementController;
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

            // Lot 4 : annales (lecture, entraînement) et « Mes signalements ».
            Route::get('annales', [AnnaleController::class, 'index'])->name('annales.index');
            Route::get('annales/{sujet}', [AnnaleController::class, 'show'])->name('annales.show');
            // Hors du préfixe gardé hors ligne (config/hors_ligne.php) : le
            // service worker ne copie pas un PDF de plusieurs Mo.
            Route::get('documents/annales/{sujet}', [AnnaleController::class, 'document'])->name('annales.document');
            Route::get('signalements', [SignalementController::class, 'index'])->name('signalements');

            // Lot 5 : examens blancs. Le passage se fait sur la fiche de
            // l'annale (?mode=examen) et vit sur l'appareil ; la fin arrive
            // par la file (`examen_blanc.terminer`).
            Route::get('examens-blancs', [ExamenBlancController::class, 'index'])->name('examens-blancs.index');
            Route::get('examens-blancs/{examen}', [ExamenBlancController::class, 'show'])->name('examens-blancs.show');
        });
    });
