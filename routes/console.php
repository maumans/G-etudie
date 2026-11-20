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

// Lot 9 : un paiement sans webhook est redemandé à l'opérateur, puis expire ;
// les codes en clair d'un lot jamais remis sont effacés.
Schedule::command('paiements:verifier')->everyFiveMinutes()->withoutOverlapping();
Schedule::command('codes:effacer-oublies')->dailyAt('04:00');

// Lot 12 (PLAN M19) : les liens des ressources externes vérifiées répondent-ils encore ?
Schedule::command('ressources:verifier')->weeklyOn(1, '05:00')->withoutOverlapping();

// Lot 13 (PLAN M18, « Impact ») : la jauge de chaque élève, relevée chaque
// dimanche soir — l'évolution du rapport d'impact se lit dans ces relevés.
Schedule::command('jauges:relever')->weeklyOn(0, '22:00')->withoutOverlapping();

// Lot 14 (terrain) : diagnostics et erreurs des appareils gardés 90 jours,
// avis des élèves un an (données minimales).
Schedule::command('terrain:purger')->dailyAt('04:30');
