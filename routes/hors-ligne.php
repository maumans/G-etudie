<?php

use App\Http\Controllers\HorsLigne\ServiceWorkerController;
use App\Http\Controllers\HorsLigne\SynchroController;
use Illuminate\Support\Facades\Route;

// Service worker : public (il doit s'installer même session expirée ; il ne
// contient aucune donnée), servi à la racine pour contrôler toutes les pages.
Route::get('sw.js', ServiceWorkerController::class)->name('hors-ligne.service-worker');

// Synchronisation de la file d'opérations (HORS_LIGNE.md A.3.6) :
// autorisation par opération, dérogation dans AccesParRoleTest.
Route::middleware(['auth', 'throttle:120,1'])->prefix('sync')->name('sync.')->group(function () {
    Route::get('etat', [SynchroController::class, 'etat'])->name('etat');
    Route::post('operations', [SynchroController::class, 'operations'])->name('operations');
});
