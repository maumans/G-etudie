<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Lot 7 (HORS_LIGNE.md A.5) : filet de nuit. Chaque publication regénère
// déjà les packs de sa matière ; un titre de chapitre ou une épreuve
// nouvelle, eux, n'en déclenchent pas.
Schedule::command('packs:generer')->dailyAt('03:00')->withoutOverlapping();
