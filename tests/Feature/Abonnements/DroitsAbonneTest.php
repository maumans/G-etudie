<?php

use App\Enums\Role;
use App\Models\Appareil;
use App\Models\Examen;
use App\Models\ExamenBlanc;
use App\Models\Matiere;
use App\Models\Pack;
use App\Models\PackElement;
use App\Models\User;
use App\Services\PackService;
use App\Support\CatalogueEleve;
use App\Support\DroitsAbonne;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

/*
 * Lot 9 : ce que l'abonnement ouvre (DroitsAbonne, décisions de Maurice du
 * 2026-11-08) — corrigés détaillés des annales (la plus récente de chaque
 * épreuve offerte), pack « libre » sans les corrigés réservés, deux examens
 * blancs par mois, deux appareils par abonnement (HL-D8).
 */

beforeEach(function () {
    Storage::fake('local');
    config(['annales.disque' => 'local']);
    $this->notion = notionDeTest();
    $this->eleve = eleveAvecProfil('BEPC');
    $bepc = Examen::where('code', 'BEPC')->sole();
    $maths = Matiere::where('slug', 'maths')->sole();
    $this->ancienne = annalePubliee($bepc, null, $maths, 2022, [$this->notion]);
    $this->recente = annalePubliee($bepc, null, $maths, 2024, [$this->notion]);
});

/** Les étapes de corrigé de toutes les questions d'une page d'annale. */
function etapesDe(array $sujet): array
{
    return collect($sujet['parties'])->flatMap(fn ($p) => $p['questions'])->flatMap(fn ($q) => $q['corrige'])->all();
}

function packMathsDe(User $eleve): Pack
{
    $epreuve = CatalogueEleve::epreuves(CatalogueEleve::profil($eleve))->first(fn ($e) => $e->matiere->slug === 'maths');

    return app(PackService::class)->generer(app(PackService::class)->pour($epreuve));
}

test('sans abonnement : le corrigé de l\'annale la plus récente est offert, les autres sont réservés', function () {
    $this->actingAs($this->eleve);

    $this->get(route('eleve.annales.show', $this->recente))->assertInertia(fn (Assert $page) => $page
        ->where('sujet.corrige_verrouille', false)
        ->where('sujet', fn ($sujet) => count(etapesDe($sujet->toArray())) === 1));

    $this->get(route('eleve.annales.show', $this->ancienne))->assertInertia(fn (Assert $page) => $page
        ->where('sujet.corrige_verrouille', true)
        // La bonne réponse reste : l'appareil dit « juste » ou « faux ».
        ->where('sujet.parties.0.questions.0.attendue.option', 'a')
        ->where('sujet', fn ($sujet) => etapesDe($sujet->toArray()) === []));

    $this->get(route('eleve.annales.index'))->assertInertia(fn (Assert $page) => $page
        ->where('sujets.donnees.0.session', 2024)
        ->where('sujets.donnees.0.corrige_ouvert', true)
        ->where('sujets.donnees.1.corrige_ouvert', false));
});

test('abonné : tous les corrigés', function () {
    abonner($this->eleve);

    $this->actingAs($this->eleve)->get(route('eleve.annales.show', $this->ancienne))->assertInertia(fn (Assert $page) => $page
        ->where('sujet.corrige_verrouille', false)
        ->where('sujet', fn ($sujet) => count(etapesDe($sujet->toArray())) === 1));
});

test('le responsable pédagogique offre un corrigé par le back-office ; un rédacteur ne le peut pas', function () {
    $redacteur = User::factory()->avecRole(Role::Redacteur)->create();
    $this->actingAs($redacteur)->patch(route('contenu.annales.corrige-libre', $this->ancienne), ['corrige_libre' => true])->assertForbidden();

    $responsable = User::factory()->avecRole(Role::AdminContenu)->create();
    $this->actingAs($responsable)->patch(route('contenu.annales.corrige-libre', $this->ancienne), ['corrige_libre' => true])->assertRedirect();
    $this->get(route('contenu.annales.show', $this->ancienne))->assertInertia(fn (Assert $page) => $page->where('sujet.corrige_libre', true));

    expect($this->ancienne->fresh()->corrige_libre)->toBeTrue();
    $this->actingAs($this->eleve)->get(route('eleve.annales.show', $this->ancienne))
        ->assertInertia(fn (Assert $page) => $page->where('sujet.corrige_verrouille', false));
});

test('le pack « libre » n\'emporte pas les corrigés réservés ; le complet, si', function () {
    $pack = packMathsDe($this->eleve);
    $cle = 'annale:'.$this->ancienne->uuid;
    $libre = PackElement::where('pack_id', $pack->id)->where('cle', $cle)->where('variante', PackElement::LIBRE)->sole();
    $complet = PackElement::where('pack_id', $pack->id)->where('cle', $cle)->where('variante', PackElement::COMPLET)->sole();

    expect($libre->props)->not->toContain('Parce que.')
        ->and($complet->props)->toContain('Parce que.')
        ->and($libre->morceau)->toBe($complet->morceau)
        ->and($pack->version)->not->toBe($pack->version_libre)
        ->and($pack->taille_libre)->toBeGreaterThan(0)
        // La plus récente n'a qu'un élément, commun aux deux variantes.
        ->and(PackElement::where('pack_id', $pack->id)->where('cle', 'annale:'.$this->recente->uuid)->pluck('variante')->all())->toBe([PackElement::COMMUN]);

    // Le non-abonné reçoit la variante libre, par les vraies routes.
    $manifeste = $this->actingAs($this->eleve)->postJson(route('eleve.packs.prendre', $pack))->assertOk();
    expect($manifeste->json('version'))->toBe($pack->version_libre)
        ->and($manifeste->json('variante'))->toBe('libre')
        ->and(collect($manifeste->json('elements'))->where(0, $cle)->count())->toBe(1);

    $morceau = $this->get(route('eleve.packs.morceau', [$pack, $libre->morceau]).'?version='.$pack->version_libre)->assertOk()->getContent();
    expect($morceau)->toContain($this->ancienne->uuid)->toContain('"corrige_verrouille":true');
    $this->get(route('eleve.packs.morceau', [$pack, 0]).'?version='.$pack->version)->assertStatus(409)->assertJsonPath('version', $pack->version_libre);

    // Il s'abonne : le battement annonce une mise à jour (les corrigés).
    abonner($this->eleve);
    $etat = $this->withHeaders(['X-Packs' => $pack->cle.'@'.$pack->version_libre])->getJson(route('sync.etat'))->assertOk();
    expect($etat->json('packs.'.$pack->cle.'.version'))->toBe($pack->version);

    $differentiel = $this->postJson(route('eleve.packs.elements', $pack), ['version' => $pack->version, 'cles' => [$cle]])->assertOk()->getContent();
    expect($differentiel)->toContain('Parce que.');
});

test('offrir un corrigé met le pack à jour (une seule variante pour cette annale)', function () {
    $pack = packMathsDe($this->eleve);
    $this->ancienne->update(['corrige_libre' => true]);
    $pack = app(PackService::class)->generer($pack);

    expect(PackElement::where('pack_id', $pack->id)->where('cle', 'annale:'.$this->ancienne->uuid)->pluck('variante')->all())->toBe([PackElement::COMMUN])
        ->and($pack->version)->toBe($pack->version_libre);
});

test('deux examens blancs par mois sans abonnement : le décompte part avec chaque page', function () {
    $this->actingAs($this->eleve)->get(route('eleve.accueil'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('droits.abonne', false)
            ->where('droits.examens_blancs.limite', 2)
            ->where('droits.examens_blancs.faits', 0)
            ->where('droits.examens_blancs.mois', now()->format('Y-m')));

    foreach ([now()->startOfMonth()->addHour(), now()->subMonthNoOverflow()->startOfMonth()] as $debut) {
        DB::table('examens_blancs')->insert([
            'uuid' => (string) Str::uuid7(), 'user_id' => $this->eleve->id, 'sujet_id' => $this->recente->id,
            'version' => 1, 'mode' => 'conditions_reelles', 'duree_minutes' => 60, 'origine_duree' => 'choisie',
            'commence_le' => $debut, 'termine_le' => $debut->copy()->addHour(), 'note_sur_20' => 12,
            'details' => '{}', 'recu_le' => $debut, 'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    expect(ExamenBlanc::query()->count())->toBe(2)
        ->and(app(DroitsAbonne::class)->pourAppareil($this->eleve)['examens_blancs']['faits'])->toBe(1);

    abonner($this->eleve);
    expect(app(DroitsAbonne::class)->pourAppareil($this->eleve)['examens_blancs']['limite'])->toBeNull();
});

test('les droits ne partent qu\'avec les pages des élèves', function () {
    $this->actingAs(User::factory()->avecRole(Role::Redacteur)->create())->get(route('contenu.accueil'))
        ->assertInertia(fn (Assert $page) => $page->where('droits', null));
});

test('HL-D8 : un abonnement vaut pour deux appareils ; au-delà, retirer un appareil rouvre les packs', function () {
    abonner($this->eleve);
    $pack = packMathsDe($this->eleve);
    $jetons = [appareilDe($this->eleve), appareilDe($this->eleve), appareilDe($this->eleve)];

    expect(app(DroitsAbonne::class)->appareils($this->eleve))->toBe(['actifs' => 3, 'limite' => 2, 'depasse' => true]);

    $this->actingAs($this->eleve)->postJson(route('eleve.packs.prendre', $pack))
        ->assertForbidden()
        ->assertJsonPath('message', 'Ton abonnement vaut pour 2 appareils et ton compte est ouvert sur 3. Retire ceux que tu n\'utilises plus dans Mon compte › Appareils.');
    $this->get(route('compte.appareils.index'))->assertInertia(fn (Assert $page) => $page->where('limite_abonne.depasse', true));

    // Un appareil qui ne parle plus depuis 30 jours ne compte plus.
    Appareil::query()->latest('id')->first()->update(['dernier_contact_le' => now()->subDays(31)]);
    $this->postJson(route('eleve.packs.prendre', $pack))->assertOk();
    expect($jetons)->toHaveCount(3);
});
