<?php

use App\Http\Middleware\SeulementEnDeveloppement;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

// Catalogue du design system Ardoise : développement et tests seulement.
Route::inertia('dev/composants', 'dev/composants')
    ->middleware(SeulementEnDeveloppement::class)
    ->name('dev.composants');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
});

require __DIR__.'/settings.php';
