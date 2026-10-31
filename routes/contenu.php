<?php

use App\Enums\Permission;
use App\Http\Controllers\Contenu\AnnaleController;
use App\Http\Controllers\Contenu\ImportAnnaleController;
use App\Http\Controllers\Contenu\LeconController;
use App\Http\Controllers\Contenu\PartieAnnaleController;
use App\Http\Controllers\Contenu\QuestionController;
use App\Http\Controllers\Contenu\Referentiel\AnneeScolaireController;
use App\Http\Controllers\Contenu\Referentiel\MatiereController;
use App\Http\Controllers\Contenu\Referentiel\OffreController;
use App\Http\Controllers\Contenu\Referentiel\ProgrammeController;
use App\Http\Controllers\Contenu\SignalementController;
use Illuminate\Support\Facades\Route;

// Back-office contenu. Chaque route porte sa permission (AccesParRoleTest) ;
// une fiche est aussi gardée par LeconPolicy (rattachement à l'auteur).

// Leçons (PLAN M4, M17) : tout le back-office consulte ; rédiger, relire et
// archiver demandent chacun leur permission.
Route::middleware('auth')->prefix('contenu')->name('contenu.lecons.')->group(function () {
    $consulter = 'can:'.Permission::EspaceContenu->value;
    $rediger = 'can:'.Permission::RedigerContenu->value;
    $relire = 'can:'.Permission::RelireContenu->value;
    $administrer = 'can:'.Permission::AdministrerContenu->value;

    Route::get('lecons', [LeconController::class, 'index'])->middleware($consulter)->name('index');
    Route::get('relecture', [LeconController::class, 'relecture'])->middleware($relire)->name('relecture');
    Route::get('lecons/creer', [LeconController::class, 'create'])->middleware($rediger)->name('create');
    Route::post('lecons', [LeconController::class, 'store'])->middleware($rediger)->name('store');
    Route::get('lecons/{lecon}', [LeconController::class, 'show'])->middleware($consulter)->name('show');
    Route::get('lecons/{lecon}/edition', [LeconController::class, 'edit'])->middleware($rediger)->name('edit');
    Route::put('lecons/{lecon}', [LeconController::class, 'update'])->middleware($rediger)->name('update');
    Route::post('lecons/{lecon}/soumettre', [LeconController::class, 'soumettre'])->middleware($rediger)->name('soumettre');
    Route::post('lecons/{lecon}/reprendre', [LeconController::class, 'reprendre'])->middleware($rediger)->name('reprendre');
    Route::post('lecons/{lecon}/modifier', [LeconController::class, 'modifier'])->middleware($rediger)->name('modifier');
    Route::post('lecons/{lecon}/publier', [LeconController::class, 'publier'])->middleware($relire)->name('publier');
    Route::post('lecons/{lecon}/renvoyer', [LeconController::class, 'renvoyer'])->middleware($relire)->name('renvoyer');
    Route::post('lecons/{lecon}/archiver', [LeconController::class, 'archiver'])->middleware($administrer)->name('archiver');
    Route::post('lecons/{lecon}/restaurer', [LeconController::class, 'restaurer'])->middleware($administrer)->name('restaurer');
});

// Questions (PLAN M5, M17) : le même circuit que les leçons, les mêmes
// permissions ; une fiche est gardée par QuestionPolicy.
Route::middleware('auth')->prefix('contenu')->name('contenu.questions.')->group(function () {
    $consulter = 'can:'.Permission::EspaceContenu->value;
    $rediger = 'can:'.Permission::RedigerContenu->value;
    $relire = 'can:'.Permission::RelireContenu->value;
    $administrer = 'can:'.Permission::AdministrerContenu->value;

    Route::get('questions', [QuestionController::class, 'index'])->middleware($consulter)->name('index');
    Route::get('relecture/questions', [QuestionController::class, 'relecture'])->middleware($relire)->name('relecture');
    Route::get('questions/creer', [QuestionController::class, 'create'])->middleware($rediger)->name('create');
    Route::post('questions', [QuestionController::class, 'store'])->middleware($rediger)->name('store');
    Route::get('questions/{question}', [QuestionController::class, 'show'])->middleware($consulter)->name('show');
    Route::get('questions/{question}/edition', [QuestionController::class, 'edit'])->middleware($rediger)->name('edit');
    Route::put('questions/{question}', [QuestionController::class, 'update'])->middleware($rediger)->name('update');
    Route::post('questions/{question}/soumettre', [QuestionController::class, 'soumettre'])->middleware($rediger)->name('soumettre');
    Route::post('questions/{question}/reprendre', [QuestionController::class, 'reprendre'])->middleware($rediger)->name('reprendre');
    Route::post('questions/{question}/modifier', [QuestionController::class, 'modifier'])->middleware($rediger)->name('modifier');
    Route::post('questions/{question}/publier', [QuestionController::class, 'publier'])->middleware($relire)->name('publier');
    Route::post('questions/{question}/renvoyer', [QuestionController::class, 'renvoyer'])->middleware($relire)->name('renvoyer');
    Route::post('questions/{question}/archiver', [QuestionController::class, 'archiver'])->middleware($administrer)->name('archiver');
    Route::post('questions/{question}/restaurer', [QuestionController::class, 'restaurer'])->middleware($administrer)->name('restaurer');
});

// Annales (PLAN M6, M17 ; lot 4) : même circuit que les leçons ; l'import
// assisté a sa permission (l'appel à l'IA a un coût) ; une fiche est gardée
// par SujetPolicy, le document original aussi.
Route::middleware('auth')->prefix('contenu')->name('contenu.annales.')->group(function () {
    $consulter = 'can:'.Permission::EspaceContenu->value;
    $rediger = 'can:'.Permission::RedigerContenu->value;
    $relire = 'can:'.Permission::RelireContenu->value;
    $administrer = 'can:'.Permission::AdministrerContenu->value;
    $importer = 'can:'.Permission::ImporterAnnales->value;

    Route::get('annales', [AnnaleController::class, 'index'])->middleware($consulter)->name('index');
    Route::get('relecture/annales', [AnnaleController::class, 'relecture'])->middleware($relire)->name('relecture');
    Route::get('annales/importer', [ImportAnnaleController::class, 'create'])->middleware($importer)->name('importer');
    Route::post('annales/imports', [ImportAnnaleController::class, 'store'])->middleware([$importer, 'throttle:20,60'])->name('imports.store');
    Route::post('annales/imports/{import}/relancer', [ImportAnnaleController::class, 'relancer'])->middleware([$importer, 'throttle:20,60'])->name('imports.relancer');
    Route::get('annales/{sujet}', [AnnaleController::class, 'show'])->middleware($consulter)->name('show');
    Route::get('annales/{sujet}/document', [AnnaleController::class, 'document'])->middleware($consulter)->name('document');
    Route::put('annales/{sujet}', [AnnaleController::class, 'update'])->middleware($rediger)->name('update');
    Route::post('annales/{sujet}/soumettre', [AnnaleController::class, 'soumettre'])->middleware($rediger)->name('soumettre');
    Route::post('annales/{sujet}/reprendre', [AnnaleController::class, 'reprendre'])->middleware($rediger)->name('reprendre');
    Route::post('annales/{sujet}/modifier', [AnnaleController::class, 'modifier'])->middleware($rediger)->name('modifier');
    Route::post('annales/{sujet}/publier', [AnnaleController::class, 'publier'])->middleware($relire)->name('publier');
    Route::post('annales/{sujet}/renvoyer', [AnnaleController::class, 'renvoyer'])->middleware($relire)->name('renvoyer');
    Route::post('annales/{sujet}/archiver', [AnnaleController::class, 'archiver'])->middleware($administrer)->name('archiver');
    Route::post('annales/{sujet}/restaurer', [AnnaleController::class, 'restaurer'])->middleware($administrer)->name('restaurer');

    Route::post('annales/{sujet}/parties', [PartieAnnaleController::class, 'store'])->middleware($rediger)->name('parties.store');
    Route::put('parties/{partie}', [PartieAnnaleController::class, 'update'])->middleware($rediger)->name('parties.update');
    Route::delete('parties/{partie}', [PartieAnnaleController::class, 'destroy'])->middleware($rediger)->name('parties.destroy');
    Route::post('parties/{partie}/questions', [PartieAnnaleController::class, 'ajouterQuestion'])->middleware($rediger)->name('questions.store');
    Route::delete('annales/questions/{question}', [PartieAnnaleController::class, 'retirerQuestion'])->middleware($rediger)->name('questions.destroy');
    Route::post('annales/questions/{question}/deplacer', [PartieAnnaleController::class, 'deplacerQuestion'])->middleware($rediger)->name('questions.deplacer');
    Route::post('annales/questions/{question}/verifier', [PartieAnnaleController::class, 'verifierQuestion'])->middleware($rediger)->name('questions.verifier');
});

// Signalements des élèves (PLAN M17 ; lot 4) : relecteurs et responsable pédagogique.
Route::middleware(['auth', 'can:'.Permission::TraiterSignalements->value])
    ->prefix('contenu/signalements')
    ->name('contenu.signalements.')
    ->group(function () {
        Route::get('/', [SignalementController::class, 'index'])->name('index');
        Route::get('{signalement}', [SignalementController::class, 'show'])->name('show');
        Route::post('{signalement}/repondre', [SignalementController::class, 'repondre'])->name('repondre');
    });

// Référentiel (PLAN M3) : responsable pédagogique et administrateur plateforme.
Route::middleware(['auth', 'can:'.Permission::GererReferentiel->value])
    ->prefix('contenu/referentiel')
    ->name('contenu.referentiel.')
    ->group(function () {
        Route::redirect('/', '/contenu/referentiel/matieres')->name('accueil');

        Route::get('matieres', [MatiereController::class, 'index'])->name('matieres.index');
        Route::post('matieres', [MatiereController::class, 'store'])->name('matieres.store');
        Route::put('matieres/{matiere}', [MatiereController::class, 'update'])->name('matieres.update');
        Route::delete('matieres/{matiere}', [MatiereController::class, 'destroy'])->name('matieres.destroy');

        Route::get('epreuves', [OffreController::class, 'index'])->name('epreuves.index');
        Route::post('epreuves', [OffreController::class, 'store'])->name('epreuves.store');
        Route::put('epreuves/{epreuve}', [OffreController::class, 'update'])->name('epreuves.update');
        Route::delete('epreuves/{epreuve}', [OffreController::class, 'destroy'])->name('epreuves.destroy');
        Route::put('examens/{examen}/session', [OffreController::class, 'session'])->name('examens.session');

        Route::get('programme', [ProgrammeController::class, 'index'])->name('programme.index');
        Route::post('chapitres', [ProgrammeController::class, 'storeChapitre'])->name('chapitres.store');
        Route::put('chapitres/{chapitre}', [ProgrammeController::class, 'updateChapitre'])->name('chapitres.update');
        Route::post('chapitres/{chapitre}/deplacer', [ProgrammeController::class, 'deplacerChapitre'])->name('chapitres.deplacer');
        Route::delete('chapitres/{chapitre}', [ProgrammeController::class, 'destroyChapitre'])->name('chapitres.destroy');
        Route::post('chapitres/{chapitre}/notions', [ProgrammeController::class, 'storeNotion'])->name('notions.store');
        Route::put('notions/{notion}', [ProgrammeController::class, 'updateNotion'])->name('notions.update');
        Route::post('notions/{notion}/deplacer', [ProgrammeController::class, 'deplacerNotion'])->name('notions.deplacer');
        Route::delete('notions/{notion}', [ProgrammeController::class, 'destroyNotion'])->name('notions.destroy');

        Route::get('annees', [AnneeScolaireController::class, 'index'])->name('annees.index');
        Route::post('annees', [AnneeScolaireController::class, 'store'])->name('annees.store');
        Route::put('annees/{annee}', [AnneeScolaireController::class, 'update'])->name('annees.update');
        Route::post('annees/{annee}/courante', [AnneeScolaireController::class, 'rendreCourante'])->name('annees.courante');
    });
