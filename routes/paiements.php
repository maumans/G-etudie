<?php

use App\Enums\Permission;
use App\Http\Controllers\Console\CodesController;
use App\Http\Controllers\Console\PaiementsController;
use App\Http\Controllers\NotificationPaiementController;
use App\Http\Controllers\PasserelleSimuleeController;
use App\Http\Middleware\SeulementEnDeveloppement;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Support\Facades\Route;

// Lot 9 (PLAN M16).

// Webhook des opérateurs : sans compte ni jeton CSRF, la signature fait foi
// (NotificationPaiementController). Hors de toute garde `auth` : rien à
// déclarer dans AccesParRoleTest.
Route::post('paiements/notifications/{passerelle}', NotificationPaiementController::class)
    ->where('passerelle', '[a-z0-9_-]+')
    ->withoutMiddleware(ValidateCsrfToken::class)
    ->middleware('throttle:webhook-paiement')
    ->name('paiements.notifications');

// Le faux écran d'opérateur de la passerelle simulée : développement et tests.
Route::get('dev/passerelle/{reference}', PasserelleSimuleeController::class)
    ->middleware(SeulementEnDeveloppement::class)
    ->name('dev.passerelle.show');

// Console plateforme : codes prépayés et paiements.
Route::middleware(['auth', 'can:'.Permission::EspaceConsole->value])
    ->prefix('console')
    ->name('console.')
    ->group(function () {
        Route::middleware('can:'.Permission::GererCodes->value)->group(function () {
            Route::get('codes', [CodesController::class, 'index'])->name('codes.index');
            Route::post('codes', [CodesController::class, 'store'])->name('codes.store');
            Route::get('codes/{lot}', [CodesController::class, 'show'])->name('codes.show');
            Route::get('codes/{lot}/impression', [CodesController::class, 'impression'])->name('codes.impression');
            Route::get('codes/{lot}/fichier', [CodesController::class, 'fichier'])->name('codes.fichier');
            Route::post('codes/{lot}/remis', [CodesController::class, 'remis'])->name('codes.remis');
            Route::post('codes/{lot}/desactiver', [CodesController::class, 'desactiver'])->name('codes.desactiver');
        });

        Route::get('paiements', [PaiementsController::class, 'index'])
            ->can(Permission::VoirPaiements)
            ->name('paiements.index');
    });
