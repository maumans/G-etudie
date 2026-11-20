<?php

use App\Enums\FormuleAbonnement;
use App\Enums\MoyenPaiement;
use App\Enums\Role;
use App\Enums\StatutPaiement;
use App\Models\Abonnement;
use App\Models\EntreeJournalAcces;
use App\Models\Etablissement;
use App\Models\Paiement;
use App\Models\ProfilEleve;
use App\Models\ReleveJauge;
use App\Models\User;
use App\Services\MaitriseService;
use App\Services\Plateforme\PlateformeService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia;

/*
| Lot 13 (PLAN M18) : la console plateforme — activité, contenu, revenus,
| impact et son rapport PDF (critère du lot). Les chiffres viennent d'une
| seule autorité (PlateformeService) ; aucun élève n'y est nommé ; un groupe
| de moins de 10 élèves n'est pas chiffré.
*/

beforeEach(function () {
    // Un vendredi midi : la semaine du lundi 16 novembre 2026.
    $this->travelTo(CarbonImmutable::parse('2026-11-20 12:00:00'));
    $this->admin = User::factory()->avecRole(Role::Superadmin)->create();
});

/** Des séances terminées, posées comme le fait SeanceService à la fin d'une séance. */
function seancesTerminees(User $eleve, CarbonImmutable $jour, int $nombre, bool $culture = false): void
{
    for ($i = 0; $i < $nombre; $i++) {
        DB::table('seances')->insert([
            'uuid' => (string) Str::uuid7(),
            'user_id' => $eleve->id,
            'jour' => $jour->toDateString(),
            'questions' => '[]',
            'duree_minutes' => 15,
            'genere_le' => $jour->setTime(6, 0),
            'termine_le' => $jour->setTime(19, $i),
            'culture' => $culture,
            'created_at' => $jour,
            'updated_at' => $jour,
        ]);
    }
}

function joursActifs(User $eleve, array $jours): void
{
    foreach ($jours as $jour) {
        DB::table('series_jours')->insert(['user_id' => $eleve->id, 'jour' => $jour, 'reponses' => 8, 'secondes' => 600, 'objectif_atteint' => false, 'created_at' => now(), 'updated_at' => now()]);
    }
}

function releve(User $eleve, string $semaine, int $pourcentage): void
{
    $profil = $eleve->profilEleve;
    ReleveJauge::query()->create([
        'user_id' => $eleve->id,
        'semaine' => $semaine,
        'pourcentage' => $pourcentage,
        'examen_id' => $profil->examen_id,
        'serie_id' => $profil->serie_id,
        'etablissement_id' => $profil->etablissement_id,
    ]);
}

/**
 * Une cohorte de N élèves BEPC : les assidus font 3 séances chaque semaine
 * de la période de 8 semaines, les autres une seule ; leur jauge passe de
 * `debut` à `fin`.
 *
 * @return list<User>
 */
function cohorte(int $nombre, bool $assidus, int $debut, int $fin, ?int $etablissement = null): array
{
    $eleves = [];
    $lundi = CarbonImmutable::parse('2026-11-16');

    for ($i = 0; $i < $nombre; $i++) {
        $eleve = eleveAvecProfil();
        if ($etablissement !== null) {
            $eleve->profilEleve->forceFill(['etablissement_id' => $etablissement])->save();
            $eleve->refresh();
        }

        for ($s = 7; $s >= 0; $s--) {
            seancesTerminees($eleve, $lundi->subWeeks($s)->addDay(), $assidus ? 3 : 1);
        }
        releve($eleve, $lundi->subWeeks(7)->toDateString(), $debut);
        releve($eleve, $lundi->subWeek()->toDateString(), $fin);
        $eleves[] = $eleve;
    }

    return $eleves;
}

test('activité : actifs du jour et de la semaine, d’après les jours où l’élève a répondu', function () {
    $a = eleveAvecProfil();
    $b = eleveAvecProfil();
    $c = eleveAvecProfil();
    joursActifs($a, ['2026-11-20', '2026-11-18']);
    joursActifs($b, ['2026-11-16']);
    joursActifs($c, ['2026-10-01']);
    // Un jour sans réponse ne rend pas actif.
    DB::table('series_jours')->insert(['user_id' => $c->id, 'jour' => '2026-11-20', 'reponses' => 0, 'secondes' => 0, 'objectif_atteint' => false, 'created_at' => now(), 'updated_at' => now()]);

    $activite = app(PlateformeService::class)->activite(CarbonImmutable::now());

    expect($activite['actifs']['jour'])->toBe(1)
        ->and($activite['actifs']['semaine'])->toBe(2)
        ->and($activite['inscrits'])->toBe(3)
        ->and($activite['semaines'])->toHaveCount(12)
        ->and($activite['semaines'][11]['semaine'])->toBe('2026-11-16')
        ->and($activite['semaines'][11]['actifs'])->toBe(2)
        ->and(collect($activite['par_examen'])->firstWhere('cle', 'BEPC')['actifs'])->toBe(2);
});

test('rétention : non chiffrée sous 10 élèves, puis la part revenue au moins 7 jours après l’inscription', function () {
    $service = app(PlateformeService::class);
    $eleves = collect(range(1, 10))->map(fn () => eleveAvecProfil());

    foreach ($eleves as $rang => $eleve) {
        $eleve->profilEleve->forceFill(['created_at' => '2026-10-01 10:00:00'])->save();
        // Sept sur dix reviennent après une semaine.
        joursActifs($eleve, $rang < 7 ? ['2026-10-01', '2026-10-12'] : ['2026-10-01']);
    }

    expect($service->activite(CarbonImmutable::now())['retention']['j7'])->toBe(['taux' => 70, 'cohorte' => 10, 'revenus' => 7]);

    $eleves->last()->profilEleve->forceFill(['created_at' => '2026-11-19 10:00:00'])->save();
    expect($service->activite(CarbonImmutable::now())['retention']['j7']['taux'])->toBeNull();
});

test('impact : assidus et autres comparés, d’après les relevés de jauge et les séances', function () {
    cohorte(10, true, 30, 50);
    cohorte(11, false, 30, 34);
    // Un quiz de culture ne rend pas assidu.
    $quiz = eleveAvecProfil();
    for ($s = 7; $s >= 0; $s--) {
        seancesTerminees($quiz, CarbonImmutable::parse('2026-11-16')->subWeeks($s)->addDay(), 4, culture: true);
    }

    $impact = app(PlateformeService::class)->impact(PlateformeService::filtresImpact(8, null, null), CarbonImmutable::now());

    expect($impact['eleves'])->toBe(22)
        ->and($impact['assidus']['eleves'])->toBe(10)
        ->and($impact['autres']['eleves'])->toBe(12)
        ->and($impact['assidus']['jauge'])->toBe(['mesures' => 10, 'debut' => 30.0, 'fin' => 50.0, 'ecart' => 20.0, 'en_progres' => 100])
        ->and($impact['autres']['jauge']['ecart'])->toBe(4.0)
        ->and($impact['autres']['jauge']['mesures'])->toBe(11)
        ->and($impact['methode']['semaines_minimum'])->toBe(4)
        ->and($impact['est_exemple'])->toBeFalse();
});

test('impact : un groupe de moins de 10 élèves mesurés n’est pas chiffré', function () {
    cohorte(9, true, 30, 60);
    cohorte(10, false, 30, 35);

    $impact = app(PlateformeService::class)->impact(PlateformeService::filtresImpact(8, null, null), CarbonImmutable::now());

    expect($impact['assidus']['eleves'])->toBe(9)
        ->and($impact['assidus']['jauge'])->toBe(['mesures' => 9, 'debut' => null, 'fin' => null, 'ecart' => null, 'en_progres' => null])
        ->and($impact['autres']['jauge']['ecart'])->toBe(5.0)
        ->and(collect($impact['courbe'])->pluck('assidus')->filter()->all())->toBe([]);
});

test('impact : les filtres d’examen et d’établissement restreignent la population ; un filtre inconnu est ignoré', function () {
    $ecole = Etablissement::query()->create(['nom' => 'Lycée de test', 'type' => 'public']);
    cohorte(2, true, 30, 40, $ecole->id);
    cohorte(3, false, 30, 31);
    eleveAvecProfil('BAC', 'SE');

    $service = app(PlateformeService::class);
    $maintenant = CarbonImmutable::now();

    expect($service->impact(PlateformeService::filtresImpact(8, 'BEPC', null), $maintenant)['eleves'])->toBe(5)
        ->and($service->impact(PlateformeService::filtresImpact(8, 'BAC-SE', null), $maintenant)['eleves'])->toBe(1)
        ->and($service->impact(PlateformeService::filtresImpact(8, null, $ecole->id), $maintenant)['eleves'])->toBe(2)
        ->and(PlateformeService::filtresImpact(5, 'BAC-ZZ', 999999))->toBe(['semaines' => 12, 'examen' => null, 'etablissement' => null]);
});

test('le relevé hebdomadaire écrit la jauge de chaque élève, par la règle de l’accueil, et se relance sans doublon', function () {
    $eleve = eleveAvecProfil();
    $attendu = app(MaitriseService::class)->jauge($eleve->profilEleve)['pourcentage'];

    $this->artisan('jauges:relever')->assertSuccessful();
    $this->artisan('jauges:relever', ['--jour' => '2026-11-18'])->assertSuccessful();

    $releve = ReleveJauge::query()->sole();
    expect($releve->user_id)->toBe($eleve->id)
        ->and($releve->semaine->toDateString())->toBe('2026-11-16')
        ->and($releve->pourcentage)->toBe($attendu)
        ->and($releve->examen_id)->toBe($eleve->profilEleve->examen_id);

    // Un compte désactivé n'est plus relevé.
    $eleve->forceFill(['desactive_le' => now()])->save();
    $this->artisan('jauges:relever', ['--jour' => '2026-11-25'])->assertSuccessful();
    expect(ReleveJauge::query()->count())->toBe(1);
});

test('revenus : paiements réussis des 30 derniers jours, abonnés en cours, par moyen', function () {
    $eleve = eleveAvecProfil();
    $paiement = fn (StatutPaiement $statut, string $le, MoyenPaiement $moyen) => Paiement::create([
        'uuid' => (string) Str::uuid7(), 'user_id' => $eleve->id, 'formule' => FormuleAbonnement::Mensuel->value,
        'montant_gnf' => 25000, 'moyen' => $moyen->value, 'passerelle' => 'simulee', 'numero_payeur' => '+224622000042',
        'numero_fin' => '42', 'reference_operateur' => (string) Str::uuid7(), 'statut' => $statut->value,
        'initie_le' => $le, 'conclu_le' => $le, 'expire_le' => $le,
    ]);
    $reussi = $paiement(StatutPaiement::Reussi, '2026-11-10 20:00:00', MoyenPaiement::OrangeMoney);
    $paiement(StatutPaiement::Reussi, '2026-11-12 20:00:00', MoyenPaiement::MtnMomo);
    $paiement(StatutPaiement::Echoue, '2026-11-12 20:00:00', MoyenPaiement::MtnMomo);
    $paiement(StatutPaiement::Reussi, '2026-09-01 20:00:00', MoyenPaiement::OrangeMoney);
    Abonnement::create(['user_id' => $eleve->id, 'formule' => 'mensuel', 'debut' => '2026-11-10', 'fin' => '2026-12-10', 'source' => 'paiement', 'paiement_id' => $reussi->id]);

    $revenus = app(PlateformeService::class)->revenus(CarbonImmutable::now());

    expect($revenus['montant_30_jours'])->toBe(50000)
        ->and($revenus['paiements_30_jours'])->toBe(2)
        ->and($revenus['echecs_30_jours'])->toBe(1)
        ->and($revenus['abonnes'])->toBe(1)
        ->and(collect($revenus['par_moyen'])->firstWhere('cle', 'orange_money')['montant_gnf'])->toBe(50000)
        ->and(collect($revenus['semaines'])->sum('montant_gnf'))->toBe(75000);
});

test('les écrans de la console s’ouvrent avec leurs chiffres, sans nom d’élève', function () {
    $eleves = cohorte(10, true, 30, 50);
    $eleves[0]->forceFill(['prenom' => 'Mariama', 'pseudo' => 'mariama_224'])->save();

    foreach ([
        '/console' => 'console/accueil',
        '/console/activite' => 'console/activite',
        '/console/contenu' => 'console/contenu',
        '/console/revenus' => 'console/revenus',
        '/console/impact' => 'console/impact',
    ] as $adresse => $composant) {
        $reponse = $this->actingAs($this->admin)->get($adresse);
        $reponse->assertOk()->assertInertia(fn (AssertableInertia $page) => $page->component($composant));
        expect($reponse->getContent())->not->toContain('Mariama')->not->toContain('mariama_224')->not->toContain($eleves[0]->telephone);
    }

    $this->actingAs($this->admin)->get('/console/impact?semaines=8')
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('impact.filtres.semaines', 8)
            ->where('impact.assidus.eleves', 10)
            ->where('impact.assidus.jauge.ecart', 20)
            ->has('choix.examens', 5));
});

test('le rapport d’impact se télécharge en PDF, avec les chiffres de l’écran, et l’export est journalisé', function () {
    cohorte(10, true, 30, 50);
    cohorte(10, false, 30, 34);
    ProfilEleve::query()->limit(1)->update(['est_exemple' => true]);

    $reponse = $this->actingAs($this->admin)->get('/console/impact/rapport?semaines=8&examen=BEPC');

    $reponse->assertOk()
        ->assertHeader('Content-Type', 'application/pdf')
        ->assertHeader('Content-Disposition', 'attachment; filename="rapport-impact-nkaramogo-2026-11-20.pdf"');
    expect(substr((string) $reponse->getContent(), 0, 5))->toBe('%PDF-')
        ->and(strlen((string) $reponse->getContent()))->toBeGreaterThan(5000);

    $entree = EntreeJournalAcces::query()->where('action', 'rapport_impact.exporte')->sole();
    expect($entree->auteur_id)->toBe($this->admin->id)
        ->and($entree->details)->toEqual(['semaines' => 8, 'examen' => 'BEPC', 'etablissement' => null]);

    // Le contenu du rapport : la vue rendue avec les mêmes chiffres.
    $html = view('rapports.impact', [
        'impact' => app(PlateformeService::class)->impact(PlateformeService::filtresImpact(8, 'BEPC', null), CarbonImmutable::now()),
        'le' => CarbonImmutable::now(),
        'polices' => [],
        'courbe' => '',
    ])->render();
    expect($html)->toContain('+20 points')->toContain('+4 pour les autres')->toContain('EXEMPLE — contenu fictif')->toContain('BEPC');
});

test('le rapport sans assez de mesures le dit, au lieu de chiffres', function () {
    cohorte(3, true, 30, 50);

    $html = view('rapports.impact', [
        'impact' => app(PlateformeService::class)->impact(PlateformeService::filtresImpact(8, null, null), CarbonImmutable::now()),
        'le' => CarbonImmutable::now(),
        'polices' => [],
        'courbe' => '',
    ])->render();

    expect($html)->toContain('Pas encore assez de mesures')->not->toContain('EXEMPLE');
    $this->actingAs($this->admin)->get('/console/impact/rapport')->assertOk()->assertHeader('Content-Type', 'application/pdf');
});

test('seul l’administrateur de la plateforme ouvre la console, l’impact et le rapport', function (Role $role) {
    $compte = User::factory()->avecRole($role)->create();

    foreach (['/console', '/console/activite', '/console/revenus', '/console/impact', '/console/impact/rapport', '/console/journal', '/console/personnel'] as $adresse) {
        $this->actingAs($compte)->get($adresse)->assertForbidden();
    }
})->with([Role::Eleve, Role::Parent, Role::Enseignant, Role::Redacteur, Role::AdminContenu, Role::GestionnaireEtablissement]);
