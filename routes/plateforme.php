<?php

use App\Enums\Permission;
use App\Http\Controllers\Console\ImpactController;
use App\Http\Controllers\Console\JournalController;
use App\Http\Controllers\Console\PersonnelController;
use App\Http\Controllers\Console\PlateformeController;
use App\Http\Controllers\Console\TerrainController;
use Illuminate\Support\Facades\Route;

/*
| Lot 13 (PLAN M18) : la console plateforme — vue d'ensemble, activité,
| contenu, revenus, impact (et son rapport PDF), journal des accès,
| personnel. En ligne seulement (HORS_LIGNE.md A.2, niveau C).
*/
Route::middleware(['auth', 'can:'.Permission::EspaceConsole->value])
    ->prefix('console')
    ->name('console.')
    ->group(function () {
        Route::get('/', [PlateformeController::class, 'accueil'])
            ->can(Permission::EspaceConsole)
            ->name('accueil');
        Route::get('activite', [PlateformeController::class, 'activite'])
            ->can(Permission::EspaceConsole)
            ->name('activite');
        Route::get('contenu', [PlateformeController::class, 'contenu'])
            ->can(Permission::EspaceConsole)
            ->name('contenu');
        Route::get('revenus', [PlateformeController::class, 'revenus'])
            ->can(Permission::VoirPaiements)
            ->name('revenus');

        Route::middleware('can:'.Permission::VoirImpact->value)->group(function () {
            Route::get('impact', [ImpactController::class, 'index'])->name('impact.index');
            Route::get('impact/rapport', [ImpactController::class, 'rapport'])->name('impact.rapport');
        });

        Route::get('journal', [JournalController::class, 'index'])
            ->can(Permission::LireJournalAcces)
            ->name('journal.index');

        // Lot 14 (terrain) : avis des élèves, diagnostics et erreurs des appareils, campagnes d'essai.
        Route::middleware('can:'.Permission::ConsoleTerrain->value)->group(function () {
            Route::get('terrain', [TerrainController::class, 'index'])->name('terrain.index');
            Route::post('terrain/campagnes', [TerrainController::class, 'creerCampagne'])->name('terrain.campagnes.store');
            Route::post('terrain/avis/{avis}/traiter', [TerrainController::class, 'traiterAvis'])->name('terrain.avis.traiter');
        });

        Route::middleware('can:'.Permission::AdministrerComptes->value)->group(function () {
            Route::get('personnel', [PersonnelController::class, 'index'])->name('personnel.index');
            Route::post('personnel/{user}/desactiver', [PersonnelController::class, 'desactiver'])->name('personnel.desactiver');
            Route::post('personnel/{user}/reactiver', [PersonnelController::class, 'reactiver'])->name('personnel.reactiver');
        });
    });
