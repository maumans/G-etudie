<?php

use App\Enums\EtatLecon;
use App\Models\Epreuve;
use App\Models\Examen;
use App\Models\User;
use App\Services\MaitriseService;
use App\Services\ProgressionService;
use App\Services\SeanceService;
use App\Services\TableauDeBordEleveService;
use App\Services\TentativeService;
use App\Support\CatalogueEleve;
use Carbon\CarbonImmutable;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

/*
 * L'accueil élève avec ses vraies données (lot 2) : compte à rebours, jauge
 * qui ne ment pas, séance du jour, matières, reprendre, série, premiers pas.
 */

function repondre(User $eleve, $question, string $option, ?CarbonImmutable $quand = null): void
{
    $quand ??= CarbonImmutable::now();
    app(TentativeService::class)->enregistrer($eleve, (string) Str::uuid7(), $question, 1, ['option' => $option], null, 20, $quand, $quand);
}

test('un élève qui n\'a rien fait voit une jauge à 0 % et ses premiers pas', function () {
    $eleve = eleveAvecProfil('BEPC');
    questionDeTest(notionDeTest());

    $this->actingAs($eleve)->get('/eleve')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('eleve/accueil')
            ->where('tableau.examen', 'BEPC')
            ->where('tableau.est_exemple', false)
            ->where('tableau.jauge.pourcentage', 0)
            ->has('tableau.jauge.matieres', 4)
            ->where('tableau.compte_a_rebours', ['date' => null, 'jours' => null])
            ->where('tableau.seance.en_cours', null)
            ->where('tableau.seance.questions', 1)
            ->where('tableau.seance.duree_minutes', 15)
            ->where('tableau.serie.jours', 0)
            ->has('tableau.serie.semaine', 7)
            ->where('tableau.premiers_pas', [
                ['cle' => 'profil', 'fait' => true],
                ['cle' => 'exercice', 'fait' => false],
                ['cle' => 'lecon', 'fait' => false],
                ['cle' => 'seance', 'fait' => false],
            ]));
});

test('la jauge se remplit des questions réussies, pondérée seulement si tous les coefficients sont saisis', function () {
    $eleve = eleveAvecProfil('BEPC');
    $maths = notionDeTest();
    $q1 = questionDeTest($maths);
    questionDeTest($maths);
    $physique = questionDeTest(notionAilleurs('physique', '10e année'));
    repondre($eleve, $q1, 'b');
    repondre($eleve, $physique, 'a');
    $profil = CatalogueEleve::profil($eleve);

    $jauge = app(MaitriseService::class)->jauge($profil);
    $parCle = collect($jauge['matieres'])->pluck('maitrise', 'cle');

    // Maths 50 %, les trois autres 0 % : moyenne simple sur 4 matières.
    expect($parCle['maths'])->toBe(50)
        ->and($parCle['physique'])->toBe(0)
        ->and($jauge['pourcentage'])->toBe(13);

    // Coefficients saisis partout : maths pèse 4 sur 10.
    $bepc = Examen::where('code', 'BEPC')->value('id');
    Epreuve::where('examen_id', $bepc)->get()->each(fn (Epreuve $e) => $e->update([
        'coefficient' => $e->matiere->slug === 'maths' ? 4 : 2,
    ]));

    expect(app(MaitriseService::class)->jauge($profil)['pourcentage'])->toBe(20);
});

test('le compte à rebours suit la date saisie par l\'équipe ; une date passée ne s\'affiche pas', function () {
    $eleve = eleveAvecProfil('BEPC');
    $examen = Examen::where('code', 'BEPC')->sole();
    $service = app(TableauDeBordEleveService::class);
    $profil = fn () => CatalogueEleve::profil($eleve);

    $examen->update(['date_prochaine_session' => '2027-06-15']);
    expect($service->donnees($eleve, $profil(), CarbonImmutable::parse('2026-10-31 20:00'))['compte_a_rebours'])
        ->toBe(['date' => '2027-06-15', 'jours' => 227]);

    $examen->update(['date_prochaine_session' => '2026-06-15']);
    expect($service->donnees($eleve, $profil(), CarbonImmutable::parse('2026-10-31 20:00'))['compte_a_rebours']['jours'])->toBeNull();
});

test('la série compte les jours de suite, jusqu\'à aujourd\'hui ou hier', function () {
    $eleve = eleveAvecProfil('BEPC');
    $question = questionDeTest(notionDeTest());
    // Samedi 31 octobre 2026 ; réponses mercredi, jeudi et vendredi.
    $maintenant = CarbonImmutable::parse('2026-10-31 18:00');

    foreach ([3, 2, 1] as $jours) {
        repondre($eleve, $question, 'b', $maintenant->subDays($jours)->setTime(20, 0));
    }
    repondre($eleve, $question, 'b', $maintenant->subDays(6)->setTime(20, 0));

    $serie = app(TableauDeBordEleveService::class)->donnees($eleve, CatalogueEleve::profil($eleve), $maintenant)['serie'];

    expect($serie['jours'])->toBe(3)
        ->and(array_column($serie['semaine'], 'jour'))->toBe(['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'])
        ->and(array_column($serie['semaine'], 'etat'))->toBe(['manque', 'manque', 'fait', 'fait', 'fait', 'en_cours', 'a_venir']);
});

test('« Reprendre » : les leçons commencées d\'abord, puis les premières du programme', function () {
    $eleve = eleveAvecProfil('BEPC');
    $premiere = leconPubliee(notionDeTest(), 'Pythagore');
    $commencee = leconPubliee(notionDeTest('La réciproque'), 'La réciproque');
    $commencee->notion->update(['ordre' => 2]);
    $comprise = leconPubliee(notionDeTest('Le cosinus'), 'Le cosinus');
    $progression = app(ProgressionService::class);
    $progression->lecon($eleve, $commencee, false, 40, CarbonImmutable::now());
    $progression->lecon($eleve, $comprise, EtatLecon::Comprise, 100, CarbonImmutable::now());

    $reprendre = app(TableauDeBordEleveService::class)->donnees($eleve, CatalogueEleve::profil($eleve))['reprendre'];

    expect(array_column($reprendre, 'uuid'))->toBe([$commencee->uuid, $premiere->uuid])
        ->and($reprendre[0]['progression'])->toBe(40);
});

test('une séance en cours se reprend depuis l\'accueil', function () {
    $eleve = eleveAvecProfil('BEPC');
    questionDeTest(notionDeTest());
    $seance = app(SeanceService::class)->commencer($eleve);

    $this->actingAs($eleve)->get('/eleve')
        ->assertInertia(fn (Assert $page) => $page
            ->where('tableau.seance.en_cours', $seance->uuid)
            ->where('tableau.seance.repondues', 0)
            ->where('tableau.seance.matieres', ['maths']));
});

test('un visiteur ne voit pas le tableau de bord', function () {
    $this->get('/eleve')->assertRedirect(route('login'));
});
