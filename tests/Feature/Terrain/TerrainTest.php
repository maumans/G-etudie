<?php

use App\Enums\EtiquetteAvis;
use App\Enums\ReponseAvis;
use App\Enums\Role;
use App\Enums\TypeErreurAppareil;
use App\Models\Appareil;
use App\Models\AvisEleve;
use App\Models\CampagneTerrain;
use App\Models\DiagnosticAppareil;
use App\Models\ErreurAppareil;
use App\Models\Etablissement;
use App\Models\MotInterdit;
use App\Models\User;
use App\Services\TerrainService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

/*
| Lot 14 (PLAN § 12, « Terrain ») : « Ton avis », le diagnostic d'un
| appareil et les erreurs captées arrivent par la file ; la console les lit
| par campagne d'essai ; un avis se traite avec sa décision. Données
| minimales : un diagnostic ne garde que ses clés connues, une erreur est
| débarrassée de tout numéro, adresse ou paramètre d'adresse.
*/

beforeEach(function () {
    $this->eleve = eleveAvecProfil('BEPC');
    $this->jeton = appareilDe($this->eleve);
    $this->appareil = Appareil::query()->sole();
});

/** @param  array<string, mixed>  $charge */
function avisDe(User $eleve, array $charge = []): array
{
    return geste($eleve, 'avis.donner', [
        'ecran' => 'seance',
        'reponse' => 'un_peu',
        'etiquettes' => ['lent', 'donnees', 'lent'],
        'commentaire' => "  Les annales\n mettent du temps.  ",
        'version_app' => 'abc123',
        ...$charge,
    ]);
}

/** @param  array<string, mixed>  $donnees */
function diagnosticDe(User $eleve, string $code = '7k3fqx', array $donnees = []): array
{
    return geste($eleve, 'diagnostic.envoyer', [
        'code' => $code,
        'donnees' => [
            'version_app' => 'abc123',
            'service_worker' => 'actif',
            'installee' => true,
            'en_attente' => '3',
            'memoire_go' => 2,
            'reseau' => '3g',
            ...$donnees,
        ],
    ]);
}

/** @param  list<array<string, mixed>>  $erreurs */
function erreursDe(User $eleve, array $erreurs): array
{
    return geste($eleve, 'erreurs.signaler', ['erreurs' => $erreurs]);
}

test('un avis part par la file, une seule fois, et se relit en base', function () {
    $geste = avisDe($this->eleve);

    envoyer($this->jeton, [$geste])->assertJsonPath('resultats.0.verdict', 'acceptee');
    envoyer($this->jeton, [$geste])->assertJsonPath('resultats.0.verdict', 'deja_recue');

    $avis = AvisEleve::query()->sole();
    expect($avis->uuid)->toBe($geste['uuid'])
        ->and($avis->user_id)->toBe($this->eleve->id)
        ->and($avis->appareil_id)->toBe($this->appareil->id)
        ->and($avis->reponse)->toBe(ReponseAvis::UnPeu)
        ->and($avis->etiquettes)->toBe(['lent', 'donnees'])
        ->and($avis->commentaire)->toBe('Les annales mettent du temps.')
        ->and($avis->version_app)->toBe('abc123')
        ->and($avis->traite_le)->toBeNull();
});

test('un avis fait hors ligne garde l\'heure du geste', function () {
    $hier = now()->subDay()->startOfHour();

    envoyer($this->jeton, [geste($this->eleve, 'avis.donner', ['ecran' => 'quiz', 'reponse' => 'oui', 'etiquettes' => []], $hier->toIso8601ZuluString('millisecond'))])
        ->assertJsonPath('resultats.0.verdict', 'acceptee');

    expect(AvisEleve::query()->sole()->donne_le->equalTo($hier))->toBeTrue();
});

test('le commentaire passe le filtre : ni numéro, ni lien, ni mot interdit', function () {
    MotInterdit::query()->create(['mot' => 'nul']);

    envoyer($this->jeton, [
        avisDe($this->eleve, ['commentaire' => 'Appelle-moi au 622 12 34 56']),
        avisDe($this->eleve, ['commentaire' => 'Va sur www.exemple.com']),
        avisDe($this->eleve, ['commentaire' => 'C\'est n.u.l']),
    ])
        ->assertJsonPath('resultats.0.verdict', 'rejetee')
        ->assertJsonPath('resultats.0.motif', 'Pas de numéro de téléphone dans ton avis : il est lu par tout le groupe.')
        ->assertJsonPath('resultats.1.verdict', 'rejetee')
        ->assertJsonPath('resultats.2.verdict', 'rejetee');

    expect(AvisEleve::query()->count())->toBe(0);
});

test('cinq avis par jour, puis un refus avec sa phrase ; le lendemain, c\'est reparti', function () {
    $gestes = array_map(fn () => avisDe($this->eleve), range(1, 6));
    $reponse = envoyer($this->jeton, $gestes)->assertOk();

    expect($reponse->json('resultats.4.verdict'))->toBe('acceptee')
        ->and($reponse->json('resultats.5.verdict'))->toBe('rejetee')
        ->and($reponse->json('resultats.5.motif'))->toContain('5 avis aujourd\'hui')
        ->and(AvisEleve::query()->count())->toBe(5);

    $this->travel(1)->day();
    envoyer(appareilDe($this->eleve, $this->jeton), [avisDe($this->eleve)])
        ->assertJsonPath('resultats.0.verdict', 'acceptee');
});

test('une réponse, un écran ou une étiquette inconnus sont refusés', function () {
    envoyer($this->jeton, [
        avisDe($this->eleve, ['reponse' => 'bof']),
        avisDe($this->eleve, ['ecran' => 'console']),
        avisDe($this->eleve, ['etiquettes' => ['inconnue']]),
        avisDe($this->eleve, ['commentaire' => str_repeat('a', 301)]),
    ])
        ->assertJsonPath('resultats.0.verdict', 'rejetee')
        ->assertJsonPath('resultats.1.verdict', 'rejetee')
        ->assertJsonPath('resultats.2.verdict', 'rejetee')
        ->assertJsonPath('resultats.3.verdict', 'rejetee');

    expect(AvisEleve::query()->count())->toBe(0);
});

test('seul un élève donne un avis ou envoie un diagnostic', function () {
    $parent = User::factory()->avecRole(Role::Parent)->create();
    $jeton = appareilDe($parent);

    envoyer($jeton, [avisDe($parent), diagnosticDe($parent), erreursDe($parent, [])])
        ->assertJsonPath('resultats.0.verdict', 'rejetee')
        ->assertJsonPath('resultats.0.motif', 'Ce compte ne peut pas faire ce geste.')
        ->assertJsonPath('resultats.1.verdict', 'rejetee')
        ->assertJsonPath('resultats.2.verdict', 'rejetee');
});

test('un diagnostic ne garde que ses clés connues, chacune dans son type', function () {
    envoyer($this->jeton, [diagnosticDe($this->eleve, donnees: ['telephone' => '+224622123456', 'installee' => 'oui'])])
        ->assertJsonPath('resultats.0.verdict', 'acceptee')
        ->assertJsonPath('resultats.0.resultat.code', '7K3FQX');

    $diagnostic = DiagnosticAppareil::query()->sole();
    expect($diagnostic->code)->toBe('7K3FQX')
        ->and($diagnostic->appareil_id)->toBe($this->appareil->id)
        ->and($diagnostic->version_app)->toBe('abc123')
        ->and($diagnostic->donnees)->not->toHaveKey('telephone')
        ->and($diagnostic->donnees['en_attente'])->toBe(3)
        ->and($diagnostic->donnees['installee'])->toBeNull()
        ->and($diagnostic->donnees['reseau'])->toBe('3g')
        ->and(array_keys($diagnostic->donnees))->toEqualCanonicalizing(array_keys(TerrainService::CHAMPS_DIAGNOSTIC));
});

test('un code de diagnostic mal formé est refusé ; au-delà de dix par jour, il est ignoré sans refus', function () {
    envoyer($this->jeton, [diagnosticDe($this->eleve, 'O0IL12')])
        ->assertJsonPath('resultats.0.verdict', 'rejetee');

    $gestes = array_map(fn () => diagnosticDe($this->eleve, 'ABC123'), range(1, 11));
    $reponse = envoyer($this->jeton, $gestes);

    expect($reponse->json('resultats.10.verdict'))->toBe('acceptee')
        ->and($reponse->json('resultats.10.resultat.garde'))->toBeFalse()
        ->and(DiagnosticAppareil::query()->count())->toBe(10);
});

test('les erreurs se regroupent par empreinte, sans numéro, adresse ni paramètre', function () {
    envoyer($this->jeton, [erreursDe($this->eleve, [
        ['type' => 'script', 'message' => 'TypeError: x is undefined at 12', 'source' => 'https://nkaramogo.gn/build/assets/seance-a1.js?v=3#l', 'version_app' => 'abc', 'fois' => 2],
        ['type' => 'script', 'message' => 'TypeError: x is undefined at 47', 'source' => 'https://nkaramogo.gn/build/assets/seance-a1.js', 'version_app' => 'abc'],
        ['type' => 'promesse', 'message' => 'Échec pour aissatou@exemple.gn au +224 622 12 34 56', 'pile' => 'jeton '.Str::random(40)],
        ['type' => 'inconnu', 'message' => 'ignorée'],
    ])])
        ->assertJsonPath('resultats.0.verdict', 'acceptee')
        ->assertJsonPath('resultats.0.resultat.gardees', 3)
        ->assertJsonPath('resultats.0.resultat.ignorees', 1);

    $script = ErreurAppareil::query()->where('type', TypeErreurAppareil::Script)->sole();
    expect($script->occurrences)->toBe(3)
        ->and($script->source)->toBe('/build/assets/seance-a1.js')
        ->and($script->dernier_appareil_id)->toBe($this->appareil->id)
        ->and($script->navigateur)->toBe($this->appareil->libelle);

    $promesse = ErreurAppareil::query()->where('type', TypeErreurAppareil::Promesse)->sole();
    expect($promesse->message)->toBe('Échec pour [adresse] au [numéro]')
        ->and($promesse->pile)->toBe('jeton [jeton]');
});

test('un appareil crée trente erreurs nouvelles par jour au plus ; une erreur connue compte toujours', function () {
    $lot = fn (int $depart) => erreursDe($this->eleve, array_map(
        fn (int $i) => ['type' => 'script', 'message' => "Erreur {$i}".str_repeat('x', $i)],
        range($depart, $depart + 19),
    ));

    envoyer($this->jeton, [$lot(1), $lot(21)])->assertOk();
    expect(ErreurAppareil::query()->count())->toBe(30);

    envoyer($this->jeton, [erreursDe($this->eleve, [['type' => 'script', 'message' => 'Erreur 1x', 'fois' => 4]])])
        ->assertJsonPath('resultats.0.resultat.gardees', 1);
    expect(ErreurAppareil::query()->where('message', 'Erreur 1x')->value('occurrences'))->toBe(5);
});

test('terrain:purger efface diagnostics et erreurs de plus de 90 jours, avis de plus d\'un an', function () {
    envoyer($this->jeton, [avisDe($this->eleve), diagnosticDe($this->eleve), erreursDe($this->eleve, [['type' => 'script', 'message' => 'Récente']])]);
    $vieux = CarbonImmutable::now()->subDays(91);
    DiagnosticAppareil::query()->create(['uuid' => (string) Str::uuid7(), 'code' => 'AAAAAA', 'appareil_id' => $this->appareil->id, 'donnees' => [], 'releve_le' => $vieux]);
    ErreurAppareil::query()->create(['empreinte' => sha1('vieille'), 'type' => 'script', 'message' => 'Vieille', 'premiere_le' => $vieux, 'derniere_le' => $vieux]);
    AvisEleve::query()->create(['uuid' => (string) Str::uuid7(), 'user_id' => $this->eleve->id, 'ecran' => 'menu', 'reponse' => 'oui', 'etiquettes' => [], 'donne_le' => now()->subDays(366)]);

    expect(Artisan::call('terrain:purger'))->toBe(0);

    expect(DiagnosticAppareil::query()->count())->toBe(1)
        ->and(ErreurAppareil::query()->pluck('message')->all())->toBe(['Récente'])
        ->and(AvisEleve::query()->count())->toBe(1);
});

test('Console › Terrain : l\'administrateur lit avis, erreurs et diagnostics ; les autres n\'entrent pas', function () {
    envoyer($this->jeton, [avisDe($this->eleve), diagnosticDe($this->eleve), erreursDe($this->eleve, [['type' => 'import', 'message' => 'Failed to fetch']])]);
    $admin = User::factory()->avecRole(Role::Superadmin)->create();

    $this->actingAs($admin)->get('/console/terrain')->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('console/terrain')
            ->where('bilan.avis', 1)
            ->where('bilan.un_peu', 1)
            ->where('bilan.a_traiter', 1)
            ->where('bilan.erreurs', 1)
            ->where('bilan.diagnostics', 1)
            ->where('exemple', false)
            ->where('liste.donnees.0.eleve', $this->eleve->pseudo)
            ->where('liste.donnees.0.etiquettes', ['C’est lent', 'Ça consomme trop de données'])
            ->where('etiquettes.0.nombre', 1));

    $this->actingAs($admin)->get('/console/terrain?vue=erreurs')->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('liste.donnees.0.type', 'import'));

    $this->actingAs($admin)->get('/console/terrain?vue=diagnostics&code=7k3fqx')->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('liste.total', 1)->where('liste.donnees.0.code', '7K3FQX'));

    foreach ([Role::AdminContenu, Role::Enseignant, Role::GestionnaireEtablissement] as $role) {
        $this->actingAs(User::factory()->avecRole($role)->create())->get('/console/terrain')->assertForbidden();
    }
});

test('une campagne filtre par ses dates et son établissement', function () {
    $college = Etablissement::query()->create(['nom' => 'Collège du test', 'type' => 'prive']);
    $this->eleve->profilEleve->update(['etablissement_id' => $college->id]);
    envoyer($this->jeton, [avisDe($this->eleve)])->assertJsonPath('resultats.0.verdict', 'acceptee');

    // Un autre élève, hors de l'établissement de la campagne.
    $autre = eleveAvecProfil('BEPC');
    envoyer(appareilDe($autre), [avisDe($autre)])->assertJsonPath('resultats.0.verdict', 'acceptee');
    $admin = User::factory()->avecRole(Role::Superadmin)->create();

    $this->actingAs($admin)->post('/console/terrain/campagnes', [
        'nom' => 'Essai Ratoma', 'lieu' => 'Conakry', 'etablissement_id' => $college->id,
        'debut' => now()->subDay()->toDateString(), 'fin' => now()->toDateString(),
    ])->assertRedirect();

    $campagne = CampagneTerrain::query()->sole();
    expect($campagne->creee_par)->toBe($admin->id)
        ->and($campagne->etablissement_id)->toBe($college->id);

    $this->actingAs($admin)->get('/console/terrain?campagne='.$campagne->id)
        ->assertInertia(fn (Assert $page) => $page->where('bilan.avis', 1)
            ->where('campagne.etablissement', 'Collège du test')
            ->where('liste.donnees.0.eleve', $this->eleve->pseudo));

    // Une campagne d'hier seulement : l'avis d'aujourd'hui n'y est pas.
    $campagne->update(['debut' => now()->subDays(3)->toDateString(), 'fin' => now()->subDays(2)->toDateString()]);
    $this->actingAs($admin)->get('/console/terrain?campagne='.$campagne->id)
        ->assertInertia(fn (Assert $page) => $page->where('bilan.avis', 0));
});

test('une campagne demande un nom, un lieu et des dates dans l\'ordre', function () {
    $admin = User::factory()->avecRole(Role::Superadmin)->create();

    $this->actingAs($admin)->post('/console/terrain/campagnes', [
        'nom' => '', 'lieu' => 'Kindia', 'debut' => '2026-12-10', 'fin' => '2026-12-01',
    ])->assertSessionHasErrors(['nom', 'fin']);

    expect(CampagneTerrain::query()->count())->toBe(0);
});

test('traiter un avis note la décision, qui et quand', function () {
    envoyer($this->jeton, [avisDe($this->eleve)]);
    $avis = AvisEleve::query()->sole();
    $admin = User::factory()->avecRole(Role::Superadmin)->create();

    $this->actingAs($admin)->post("/console/terrain/avis/{$avis->id}/traiter", ['decision' => ''])
        ->assertSessionHasErrors('decision');
    expect($avis->fresh()->traite_le)->toBeNull();

    $this->actingAs($admin)->post("/console/terrain/avis/{$avis->id}/traiter", ['decision' => 'Annales allégées dans la version suivante.'])
        ->assertRedirect();

    $avis->refresh();
    expect($avis->decision)->toBe('Annales allégées dans la version suivante.')
        ->and($avis->traite_par)->toBe($admin->id)
        ->and($avis->traite_le)->not->toBeNull();

    $this->actingAs($admin)->post('/console/terrain/avis/999999/traiter', ['decision' => 'Rien'])->assertNotFound();
});

test('l\'empreinte ignore les nombres ; anonymiser masque numéro, adresse et jeton', function () {
    $a = TerrainService::empreinte(TypeErreurAppareil::Script, 'Erreur ligne 12', '/a.js', 'v1');
    $b = TerrainService::empreinte(TypeErreurAppareil::Script, 'Erreur ligne 480', '/a.js', 'v1');
    $c = TerrainService::empreinte(TypeErreurAppareil::Script, 'Erreur ligne 12', '/a.js', 'v2');

    expect($a)->toBe($b)->not->toBe($c)
        ->and(TerrainService::source('https://x.gn/eleve/annales/12?jeton=abc'))->toBe('/eleve/annales/12')
        ->and(TerrainService::source(''))->toBeNull();
});

test('les étiquettes et réponses de l\'appareil sont celles du serveur', function () {
    $source = (string) file_get_contents(resource_path('js/lib/terrain/avis.ts'));

    foreach (EtiquetteAvis::cases() as $etiquette) {
        expect($source)->toContain("{ cle: '{$etiquette->value}', libelle: '{$etiquette->libelle()}' }");
    }

    foreach (ReponseAvis::cases() as $reponse) {
        expect($source)->toContain("{ cle: '{$reponse->value}', libelle: '{$reponse->libelle()}' }");
    }
});
