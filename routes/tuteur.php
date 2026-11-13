<?php

use App\Enums\Permission;
use App\Http\Controllers\Console\TuteurController as ConsoleTuteurController;
use App\Http\Controllers\Contenu\JournalTuteurController;
use Illuminate\Support\Facades\Route;

// Lot 10 (PLAN M11) : le tuteur N'karamögö côté équipe. Les routes de
// l'élève sont dans routes/eleve.php.

// Back-office › Tuteur : le journal des échanges, sans l'identité des élèves.
Route::middleware(['auth', 'can:'.Permission::EspaceContenu->value, 'can:'.Permission::LireJournalTuteur->value])
    ->prefix('contenu/tuteur')
    ->name('contenu.tuteur.')
    ->group(function () {
        Route::get('/', [JournalTuteurController::class, 'index'])->name('index');
        Route::get('{conversation}', [JournalTuteurController::class, 'show'])->name('show');
        Route::post('reponses/{message}/classer', [JournalTuteurController::class, 'classer'])->name('classer');
    });

// Console › Tuteur : usage et coûts.
Route::get('console/tuteur', [ConsoleTuteurController::class, 'index'])
    ->middleware(['auth', 'can:'.Permission::EspaceConsole->value, 'can:'.Permission::VoirCoutsTuteur->value])
    ->name('console.tuteur.index');
