<?php

use App\Enums\Permission;
use App\Http\Controllers\Communaute\FilController;
use App\Http\Controllers\Compte\ParentsController as CompteParentsController;
use App\Http\Controllers\Console\EtablissementsController as ConsoleEtablissementsController;
use App\Http\Controllers\Eleve\DevoirController as EleveDevoirController;
use App\Http\Controllers\Eleve\GroupeController as EleveGroupeController;
use App\Http\Controllers\Enseignant\DevoirController as EnseignantDevoirController;
use App\Http\Controllers\Enseignant\GroupeController as EnseignantGroupeController;
use App\Http\Controllers\Etablissement\EtablissementController;
use App\Http\Controllers\Parent\EnfantController;
use App\Http\Middleware\ProfilEleveRequis;
use Illuminate\Support\Facades\Route;

/*
| Lot 11 (PLAN M13-M15). Tout est en ligne seulement (niveau C,
| HORS_LIGNE.md A.2 : « liaison parent · groupes et devoirs ») : rien ici
| n'entre dans la liste blanche du service worker. Seule exception de fait :
| la séance d'un devoir, une fois commencée, se joue sur /eleve/seances/…
| (déjà gardée) et ses réponses passent par la file d'opérations.
*/

// Espace parent : ses enfants, en lecture seule ; payer leur abonnement.
Route::middleware(['auth', 'can:'.Permission::EspaceParent->value])
    ->prefix('parent')
    ->name('parent.')
    ->group(function () {
        Route::get('/', [EnfantController::class, 'index'])->name('accueil');
        Route::post('liens', [EnfantController::class, 'lier'])
            ->middleware('throttle:code-liaison')
            ->name('liens.store');
        Route::delete('enfants/{enfant}', [EnfantController::class, 'delier'])->name('enfants.delier');
        Route::get('enfants/{enfant}', [EnfantController::class, 'show'])->name('enfants.show');

        Route::middleware('can:'.Permission::SouscrireAbonnement->value)->group(function () {
            Route::get('enfants/{enfant}/abonnement', [EnfantController::class, 'abonnement'])->name('enfants.abonnement');
            Route::post('enfants/{enfant}/paiements', [EnfantController::class, 'payer'])
                ->middleware('throttle:paiement')
                ->name('enfants.paiements.store');
            Route::post('enfants/{enfant}/code', [EnfantController::class, 'code'])
                ->middleware('throttle:code-acces')
                ->name('enfants.code');
            Route::get('paiements/{paiement}', [EnfantController::class, 'paiement'])->name('paiements.show');
        });
    });

// Espace enseignant : ses groupes, ses devoirs, le suivi.
Route::middleware(['auth', 'can:'.Permission::EspaceEnseignant->value, 'can:'.Permission::GererGroupes->value])
    ->prefix('enseignant')
    ->name('enseignant.')
    ->group(function () {
        Route::get('/', [EnseignantGroupeController::class, 'index'])->name('accueil');
        Route::post('groupes', [EnseignantGroupeController::class, 'store'])->name('groupes.store');
        Route::get('groupes/{groupe}', [EnseignantGroupeController::class, 'show'])->name('groupes.show');
        Route::patch('groupes/{groupe}', [EnseignantGroupeController::class, 'update'])->name('groupes.update');
        Route::post('groupes/{groupe}/code', [EnseignantGroupeController::class, 'changerCode'])->name('groupes.code');
        Route::post('groupes/{groupe}/archiver', [EnseignantGroupeController::class, 'archiver'])->name('groupes.archiver');
        Route::delete('groupes/{groupe}/eleves/{eleve}', [EnseignantGroupeController::class, 'retirer'])->name('groupes.eleves.retirer');

        Route::get('groupes/{groupe}/devoirs/nouveau', [EnseignantDevoirController::class, 'create'])->name('devoirs.create');
        Route::post('groupes/{groupe}/devoirs', [EnseignantDevoirController::class, 'store'])->name('devoirs.store');
        Route::get('devoirs/{devoir}', [EnseignantDevoirController::class, 'show'])->name('devoirs.show');
        Route::patch('devoirs/{devoir}', [EnseignantDevoirController::class, 'update'])->name('devoirs.update');
    });

// Espace établissement : enseignants rattachés, licences, rapport par groupe.
Route::middleware(['auth', 'can:'.Permission::EspaceEtablissement->value, 'can:'.Permission::GererEtablissement->value])
    ->prefix('etablissement')
    ->name('etablissement.')
    ->group(function () {
        Route::get('/', [EtablissementController::class, 'index'])->name('accueil');
        Route::get('groupes/{groupe}', [EtablissementController::class, 'groupe'])->name('groupes.show');
        Route::get('licences', [EtablissementController::class, 'licences'])->name('licences');
        Route::post('licences/{licence}/eleves', [EtablissementController::class, 'attribuer'])->name('licences.attribuer');
        Route::delete('licences/{licence}/eleves/{eleve}', [EtablissementController::class, 'reprendre'])->name('licences.reprendre');
        Route::post('enseignants', [EtablissementController::class, 'rattacher'])->name('enseignants.store');
        Route::delete('enseignants/{rattachement}', [EtablissementController::class, 'retirer'])->name('enseignants.retirer');
    });

// Élève : ses groupes et ses devoirs ; le code pour son parent.
Route::middleware(['auth', 'can:'.Permission::EspaceEleve->value, 'can:'.Permission::RejoindreGroupe->value, ProfilEleveRequis::class])
    ->prefix('eleve')
    ->name('eleve.')
    ->group(function () {
        Route::get('groupes', [EleveGroupeController::class, 'index'])->name('groupes.index');
        Route::post('groupes', [EleveGroupeController::class, 'rejoindre'])
            ->middleware('throttle:code-groupe')
            ->name('groupes.rejoindre');
        Route::delete('groupes/{groupe}', [EleveGroupeController::class, 'quitter'])->name('groupes.quitter');
        Route::post('devoirs/{devoir}/commencer', [EleveDevoirController::class, 'commencer'])->name('devoirs.commencer');
        // Lot 12 : paraître (par son pseudo) au classement des défis du groupe.
        Route::post('groupes/{groupe}/classement', [EleveGroupeController::class, 'classement'])->name('groupes.classement');
    });

// Lot 12 (PLAN M13) : le fil « Questions du groupe », côté élève. En ligne
// seulement (niveau C) ; le brouillon reste sur l'appareil.
Route::middleware(['auth', 'can:'.Permission::EspaceEleve->value, 'can:'.Permission::ParticiperCommunaute->value, ProfilEleveRequis::class])
    ->prefix('eleve')
    ->name('eleve.')
    ->group(function () {
        Route::get('groupes/{groupe}/fil', [FilController::class, 'eleve'])->name('fil.show');
        Route::post('groupes/{groupe}/publications', [FilController::class, 'publier'])
            ->middleware('throttle:fil')
            ->name('fil.publier');
        Route::post('publications/{publication}/signaler', [FilController::class, 'signaler'])
            ->middleware('throttle:fil')
            ->name('fil.signaler');
    });

// Lot 12 : le fil côté enseignant — répondre, masquer en un geste (critère
// du lot), garder, retirer la parole, fermer.
Route::middleware(['auth', 'can:'.Permission::EspaceEnseignant->value, 'can:'.Permission::ModererCommunaute->value])
    ->prefix('enseignant')
    ->name('enseignant.fil.')
    ->group(function () {
        Route::get('groupes/{groupe}/fil', [FilController::class, 'enseignant'])->name('show');
        Route::post('groupes/{groupe}/publications', [FilController::class, 'publier'])->name('publier');
        Route::post('publications/{publication}/masquer', [FilController::class, 'masquer'])->name('masquer');
        Route::post('publications/{publication}/garder', [FilController::class, 'garder'])->name('garder');
        Route::post('groupes/{groupe}/eleves/{eleve}/parole', [FilController::class, 'parole'])->name('parole');
        Route::post('groupes/{groupe}/fil', [FilController::class, 'fermer'])->name('fermer');
    });

Route::middleware(['auth', 'can:'.Permission::InviterParent->value])
    ->prefix('compte')
    ->name('compte.')
    ->group(function () {
        Route::get('parents', [CompteParentsController::class, 'index'])->name('parents.index');
        Route::post('parents/code', [CompteParentsController::class, 'code'])
            ->middleware('throttle:6,1')
            ->name('parents.code');
        Route::delete('parents/{lien}', [CompteParentsController::class, 'retirer'])->name('parents.retirer');
    });

// Console : établissements, gestionnaires, licences.
Route::middleware(['auth', 'can:'.Permission::EspaceConsole->value, 'can:'.Permission::AdministrerEtablissements->value])
    ->prefix('console/etablissements')
    ->name('console.etablissements.')
    ->group(function () {
        Route::get('/', [ConsoleEtablissementsController::class, 'index'])->name('index');
        Route::post('/', [ConsoleEtablissementsController::class, 'store'])->name('store');
        Route::get('{etablissement}', [ConsoleEtablissementsController::class, 'show'])->name('show');
        Route::post('{etablissement}/gestionnaires', [ConsoleEtablissementsController::class, 'gestionnaire'])->name('gestionnaires.store');
        Route::post('{etablissement}/licences', [ConsoleEtablissementsController::class, 'licence'])->name('licences.store');
    });
