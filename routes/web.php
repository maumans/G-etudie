<?php

use App\Enums\Permission;
use App\Http\Controllers\AiguillageController;
use App\Http\Controllers\Contenu\TableauDeBordController as ContenuTableauDeBordController;
use App\Http\Controllers\Vitrine\PartageController;
use App\Http\Controllers\Vitrine\PlanSiteController;
use App\Http\Controllers\Vitrine\RobotsController;
use App\Http\Controllers\Vitrine\SujetPublicController;
use App\Http\Controllers\VitrineController;
use App\Http\Middleware\SeulementEnDeveloppement;
use Illuminate\Support\Facades\Route;

// Vitrine (habillage public) : accueil, annales publiques, plan du site,
// images de partage (lot 8). Sans compte, donc sans `can:`.
Route::get('/', VitrineController::class)->name('home');
Route::get('sujets', [SujetPublicController::class, 'index'])->name('vitrine.sujets.index');
Route::get('sujets/{slug}', [SujetPublicController::class, 'show'])
    ->where('slug', '[a-z0-9-]+')
    ->name('vitrine.sujets.show');
Route::get('sitemap.xml', PlanSiteController::class)->name('plan-site');
Route::get('robots.txt', RobotsController::class)->name('robots');
Route::get('partage/n-karamogo.png', [PartageController::class, 'generale'])->name('partage.image.generale');
Route::get('partage/sujets/{slug}.png', [PartageController::class, 'sujet'])
    ->where('slug', '[a-z0-9-]+')
    ->name('partage.image.sujet');

// Catalogue du design system Ardoise : développement et tests seulement.
Route::inertia('dev/composants', 'dev/composants')
    ->middleware(SeulementEnDeveloppement::class)
    ->name('dev.composants');

// Entrées des trois espaces connectés : chaque route porte sa permission
// (AccesParRoleTest échoue sur toute route authentifiée sans `can:`).
Route::middleware('auth')->group(function () {
    // Après connexion, chaque compte est aiguillé vers son espace (fortify.home).
    Route::get('accueil', AiguillageController::class)->name('accueil');

    Route::get('contenu', ContenuTableauDeBordController::class)
        ->can(Permission::EspaceContenu)
        ->name('contenu.accueil');
    // La console plateforme : routes/plateforme.php (lot 13).
});

// Espace élève : routes/eleve.php (accueil, parcours, cours, séance).
require __DIR__.'/eleve.php';

require __DIR__.'/contenu.php';

require __DIR__.'/compte.php';

require __DIR__.'/hors-ligne.php';

require __DIR__.'/paiements.php';

require __DIR__.'/tuteur.php';

require __DIR__.'/plateforme.php';

// Lot 11 : parents, enseignants, établissements (et la console des établissements).
require __DIR__.'/organisation.php';
