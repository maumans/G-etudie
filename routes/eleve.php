<?php

use App\Enums\Permission;
use App\Http\Controllers\Eleve\AbonnementController;
use App\Http\Controllers\Eleve\AccueilController;
use App\Http\Controllers\Eleve\AnnaleController;
use App\Http\Controllers\Eleve\CoursController;
use App\Http\Controllers\Eleve\CultureController;
use App\Http\Controllers\Eleve\ExamenBlancController;
use App\Http\Controllers\Eleve\LeconController;
use App\Http\Controllers\Eleve\PackController;
use App\Http\Controllers\Eleve\PaiementController;
use App\Http\Controllers\Eleve\ParcoursAccueilController;
use App\Http\Controllers\Eleve\ProgressionController;
use App\Http\Controllers\Eleve\SeanceController;
use App\Http\Controllers\Eleve\SignalementController;
use App\Http\Controllers\Eleve\TuteurController;
use App\Http\Middleware\ProfilEleveRequis;
use Illuminate\Support\Facades\Route;

// Espace élève (lot 2). Toutes les routes portent `can:espace.eleve`
// (AccesParRoleTest) ; ce que l'élève voit, c'est App\Support\CatalogueEleve.
// Les gestes (réponses, progression, fin de séance) ne passent pas par ici
// mais par la file d'opérations (/sync/operations, HORS_LIGNE.md A.6).
Route::middleware(['auth', 'can:'.Permission::EspaceEleve->value])
    ->prefix('eleve')
    ->name('eleve.')
    ->group(function () {
        // Sans profil, l'accueil envoie lui-même au parcours.
        Route::get('/', AccueilController::class)->name('accueil');
        Route::get('bienvenue', [ParcoursAccueilController::class, 'edit'])->name('bienvenue');
        Route::put('bienvenue', [ParcoursAccueilController::class, 'update'])->name('bienvenue.update');

        // Lot 9 : abonnement, paiement par mobile money, code prépayé. En
        // ligne seulement (hors de la liste blanche, HORS_LIGNE.md A.2).
        Route::middleware('can:'.Permission::SouscrireAbonnement->value)->group(function () {
            Route::get('abonnement', [AbonnementController::class, 'index'])->name('abonnement');
            Route::get('abonnement/payer/{formule}', [AbonnementController::class, 'payer'])->name('abonnement.payer');
            Route::post('abonnement/code', [AbonnementController::class, 'code'])
                ->middleware('throttle:code-acces')
                ->name('abonnement.code');
            Route::post('paiements', [PaiementController::class, 'store'])
                ->middleware('throttle:paiement')
                ->name('paiements.store');
            Route::get('paiements/{paiement}', [PaiementController::class, 'show'])->name('paiements.show');
        });

        Route::middleware(ProfilEleveRequis::class)->group(function () {
            Route::get('cours', [CoursController::class, 'index'])->name('cours');
            Route::get('cours/{matiere:slug}', [CoursController::class, 'matiere'])->name('cours.matiere');
            Route::get('lecons/{lecon}', [LeconController::class, 'show'])->name('lecons.show');
            Route::get('chapitres/{chapitre}/fiche', [LeconController::class, 'fiche'])->name('chapitres.fiche');

            Route::post('seance', [SeanceController::class, 'commencer'])->name('seance.commencer');
            Route::get('seances/{seance}', [SeanceController::class, 'show'])->name('seances.show');

            // Lot 4 : sujets d'examen (lecture, entraînement) et « Mes signalements ».
            Route::get('sujets', [AnnaleController::class, 'index'])->name('sujets.index');
            Route::get('sujets/{sujet}', [AnnaleController::class, 'show'])->name('sujets.show');
            // Hors du préfixe gardé hors ligne (config/hors_ligne.php) : le
            // service worker ne copie pas un PDF de plusieurs Mo.
            Route::get('documents/sujets/{sujet}', [AnnaleController::class, 'document'])->name('sujets.document');
            Route::get('signalements', [SignalementController::class, 'index'])->name('signalements');

            // Lot 5 : examens blancs. Le passage se fait sur la fiche de
            // l'annale (?mode=examen) et vit sur l'appareil ; la fin arrive
            // par la file (`examen_blanc.terminer`).
            Route::get('examens-blancs', [ExamenBlancController::class, 'index'])->name('examens-blancs.index');
            Route::get('examens-blancs/{examen}', [ExamenBlancController::class, 'show'])->name('examens-blancs.show');

            // Lot 6 : « Ma progression » ; l'instantané (jauge, série, trois
            // séances préparées) que l'appareil garde pour le hors ligne (HL4).
            Route::get('progression', [ProgressionController::class, 'index'])->name('progression');
            Route::get('instantane', [ProgressionController::class, 'instantane'])->name('instantane');

            // Lot 7 (HL5) : téléchargements. L'écran se relit hors ligne ;
            // les routes JSON des packs ne sont jamais copiées par le
            // service worker (hors de sa liste blanche).
            Route::get('telechargements', [PackController::class, 'index'])->name('telechargements');
            Route::post('packs/{pack}/prendre', [PackController::class, 'prendre'])->name('packs.prendre');
            Route::get('packs/{pack}/manifeste', [PackController::class, 'manifeste'])->name('packs.manifeste');
            Route::get('packs/{pack}/morceaux/{numero}', [PackController::class, 'morceau'])->whereNumber('numero')->name('packs.morceau');
            Route::post('packs/{pack}/elements', [PackController::class, 'elements'])->name('packs.elements');
            Route::delete('packs/{pack}', [PackController::class, 'retirer'])->name('packs.retirer');

            // Lot 12 : culture générale. L'écran se relit hors ligne
            // (config/hors_ligne.php) ; un quiz se joue sur /eleve/seances/….
            Route::get('culture', [CultureController::class, 'index'])->name('culture');
            Route::post('culture/quiz', [CultureController::class, 'lancer'])->name('culture.quiz');

            // Lot 10 : le tuteur N'karamögö. En ligne seulement (hors de la
            // liste blanche, HORS_LIGNE.md A.2) ; la réponse arrive en flux.
            Route::middleware('can:'.Permission::UtiliserTuteur->value)->group(function () {
                Route::get('tuteur', [TuteurController::class, 'index'])->name('tuteur');
                Route::get('tuteur/{conversation}', [TuteurController::class, 'show'])->name('tuteur.show');
                Route::post('tuteur/demandes', [TuteurController::class, 'demander'])
                    ->middleware('throttle:tuteur')
                    ->name('tuteur.demander');
                Route::post('tuteur/reponses/{message}/signaler', [TuteurController::class, 'signaler'])->name('tuteur.signaler');
            });
        });
    });
