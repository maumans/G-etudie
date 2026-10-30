<?php

use App\Enums\Permission;
use App\Http\Controllers\Contenu\Referentiel\AnneeScolaireController;
use App\Http\Controllers\Contenu\Referentiel\MatiereController;
use App\Http\Controllers\Contenu\Referentiel\OffreController;
use App\Http\Controllers\Contenu\Referentiel\ProgrammeController;
use Illuminate\Support\Facades\Route;

// Back-office contenu. Chaque route porte sa permission (AccesParRoleTest).

// Référentiel (PLAN M3) : responsable pédagogique et administrateur plateforme.
Route::middleware(['auth', 'can:'.Permission::GererReferentiel->value])
    ->prefix('contenu/referentiel')
    ->name('contenu.referentiel.')
    ->group(function () {
        Route::redirect('/', '/contenu/referentiel/matieres')->name('accueil');

        Route::get('matieres', [MatiereController::class, 'index'])->name('matieres.index');
        Route::post('matieres', [MatiereController::class, 'store'])->name('matieres.store');
        Route::put('matieres/{matiere}', [MatiereController::class, 'update'])->name('matieres.update');
        Route::delete('matieres/{matiere}', [MatiereController::class, 'destroy'])->name('matieres.destroy');

        Route::get('epreuves', [OffreController::class, 'index'])->name('epreuves.index');
        Route::post('epreuves', [OffreController::class, 'store'])->name('epreuves.store');
        Route::put('epreuves/{epreuve}', [OffreController::class, 'update'])->name('epreuves.update');
        Route::delete('epreuves/{epreuve}', [OffreController::class, 'destroy'])->name('epreuves.destroy');

        Route::get('programme', [ProgrammeController::class, 'index'])->name('programme.index');
        Route::post('chapitres', [ProgrammeController::class, 'storeChapitre'])->name('chapitres.store');
        Route::put('chapitres/{chapitre}', [ProgrammeController::class, 'updateChapitre'])->name('chapitres.update');
        Route::post('chapitres/{chapitre}/deplacer', [ProgrammeController::class, 'deplacerChapitre'])->name('chapitres.deplacer');
        Route::delete('chapitres/{chapitre}', [ProgrammeController::class, 'destroyChapitre'])->name('chapitres.destroy');
        Route::post('chapitres/{chapitre}/notions', [ProgrammeController::class, 'storeNotion'])->name('notions.store');
        Route::put('notions/{notion}', [ProgrammeController::class, 'updateNotion'])->name('notions.update');
        Route::post('notions/{notion}/deplacer', [ProgrammeController::class, 'deplacerNotion'])->name('notions.deplacer');
        Route::delete('notions/{notion}', [ProgrammeController::class, 'destroyNotion'])->name('notions.destroy');

        Route::get('annees', [AnneeScolaireController::class, 'index'])->name('annees.index');
        Route::post('annees', [AnneeScolaireController::class, 'store'])->name('annees.store');
        Route::put('annees/{annee}', [AnneeScolaireController::class, 'update'])->name('annees.update');
        Route::post('annees/{annee}/courante', [AnneeScolaireController::class, 'rendreCourante'])->name('annees.courante');
    });
