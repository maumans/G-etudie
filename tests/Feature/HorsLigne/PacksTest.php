<?php

use App\Enums\Role;
use App\Models\Examen;
use App\Models\Matiere;
use App\Models\Pack;
use App\Models\PackElement;
use App\Models\Serie;
use App\Models\User;
use App\Services\ContenuService;
use App\Services\PackService;
use App\Support\Abonnements\SourceAbonnements;
use App\Support\CatalogueEleve;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

/*
 * Lot 7, HL5 (HORS_LIGNE.md A.5) : les packs. A.14 n° 8 (différentiel) et
 * n° 9 (droits), plus le format, les morceaux, l'absence de toute donnée
 * personnelle et l'annonce des versions par le battement.
 */

beforeEach(function () {
    Storage::fake('local');
    config(['annales.disque' => 'local']);
    $this->notion = notionDeTest();
    $this->eleve = eleveAvecProfil('BEPC');
});

afterEach(fn () => Carbon::setTestNow());

/** Le pack d'une matière de l'élève, généré. */
function packDe(User $eleve, string $slug = 'maths'): Pack
{
    $epreuve = CatalogueEleve::epreuves(CatalogueEleve::profil($eleve))->first(fn ($e) => $e->matiere->slug === $slug);

    return app(PackService::class)->generer(app(PackService::class)->pour($epreuve));
}

/** Un faux abonnement (le vrai arrive au lot 9). */
function abonnerJusquau(?CarbonImmutable $fin): void
{
    app()->instance(SourceAbonnements::class, new class($fin) implements SourceAbonnements
    {
        public function __construct(private ?CarbonImmutable $fin) {}

        public function finAbonnement(User $eleve): ?CarbonImmutable
        {
            return $this->fin;
        }
    });
}

/** @return array<string, string> clé => empreinte */
function empreintes(Pack $pack): array
{
    return PackElement::where('pack_id', $pack->id)->pluck('empreinte', 'cle')->all();
}

test('un pack contient la matière, ses leçons, ses fiches et ses sujets, avec les props mêmes des écrans', function () {
    $lecon = leconPubliee($this->notion);
    $annale = annalePubliee(Examen::where('code', 'BEPC')->sole(), null, Matiere::where('slug', 'maths')->sole(), 2024, [$this->notion]);
    $pack = packDe($this->eleve);

    expect($pack->cle)->toBe('bepc-maths')
        ->and($pack->version)->toHaveLength(16)
        ->and($pack->compte)->toEqualCanonicalizing(['lecons' => 1, 'fiches' => 1, 'annales' => 1])
        ->and(array_keys(empreintes($pack)))->toEqualCanonicalizing([
            'matiere:bepc-maths', "lecon:{$lecon->uuid}", "fiche:{$this->notion->chapitre_id}", "annale:{$annale->uuid}",
        ]);

    // La leçon du pack = l'objet de contenu et le contexte de la route en ligne.
    $element = json_decode(PackElement::where('cle', "lecon:{$lecon->uuid}")->value('props'), true);
    $this->actingAs($this->eleve)->get(route('eleve.lecons.show', $lecon))
        ->assertInertia(fn (Assert $page) => $page
            ->where('lecon', $element['lecon'])
            ->where('contexte', $element['contexte']));

    // La fiche cite ses leçons au lieu de les recopier.
    $fiche = json_decode(PackElement::where('cle', "fiche:{$this->notion->chapitre_id}")->value('props'), true);
    expect($fiche['lecons'])->toBe([])->and($fiche['lecons_du_pack'])->toBe([$lecon->uuid]);

    // Le sujet : le même objet `sujet` que la fiche en ligne.
    $sujet = json_decode(PackElement::where('cle', "annale:{$annale->uuid}")->value('props'), true)['sujet'];
    $this->get(route('eleve.sujets.show', $annale))->assertInertia(fn (Assert $page) => $page->where('sujet', $sujet));
});

test('aucune donnée personnelle : deux élèves du même examen reçoivent exactement le même pack', function () {
    $lecon = leconPubliee($this->notion);
    $avant = empreintes(packDe($this->eleve));

    // L'élève lit, comprend, répond : rien de cela n'entre dans le pack.
    $jeton = appareilDe($this->eleve);
    envoyer($jeton, [geste($this->eleve, 'lecon.progression', ['lecon' => $lecon->uuid, 'etat' => 'comprise', 'position' => 100])])
        ->assertJsonPath('resultats.0.verdict', 'acceptee');
    $autre = eleveAvecProfil('BEPC');
    $pack = packDe($autre);
    $tout = PackElement::where('pack_id', $pack->id)->pluck('props')->implode('');

    expect(empreintes($pack))->toBe($avant)
        ->and($tout)->not->toContain($this->eleve->pseudo)
        ->and($tout)->not->toContain($this->eleve->telephone)
        ->and($tout)->not->toContain('"comprise"');
});

test('A.14 n° 8 — après correction d\'un corrigé, seul cet élément change d\'empreinte, et la mise à jour pèse moins de 20 Ko', function () {
    leconPubliee($this->notion);
    $annale = annalePubliee(Examen::where('code', 'BEPC')->sole(), null, Matiere::where('slug', 'maths')->sole(), 2024, [$this->notion]);
    $pack = packDe($this->eleve);
    $avant = empreintes($pack);
    $this->actingAs($this->eleve)->postJson(route('eleve.packs.prendre', $pack))->assertOk();

    // L'équipe corrige le corrigé de la question du sujet après un
    // signalement : la publication regénère le pack (en file, GenererPack).
    $question = $annale->questions()->first();
    $redacteur = $question->auteur;
    $contenu = app(ContenuService::class);
    $question = $contenu->ouvrirModification($question, $redacteur);
    $champs = $question->contenuDuBrouillon();
    $question = $contenu->enregistrerQuestion($question, $redacteur, [...$champs, 'corrige' => [['titre' => 'Corrigé', 'blocs' => blocsDeTest('Parce que a² + b² = c².')]]], $question->revision);
    $contenu->publier($contenu->soumettre($question, $redacteur), User::factory()->avecRole(Role::Relecteur)->create());

    $pack->refresh();
    $apres = empreintes($pack);
    $changes = array_keys(array_diff_assoc($apres, $avant));

    expect($changes)->toBe(["annale:{$annale->uuid}"])
        ->and(array_keys($apres))->toEqualCanonicalizing(array_keys($avant));

    // L'appareil voit la nouvelle version au battement, puis ne demande que ce qui a changé.
    $manifeste = $this->getJson(route('eleve.packs.manifeste', $pack))->assertOk()->json();
    $miseAJour = $this->postJson(route('eleve.packs.elements', $pack), ['version' => $pack->version, 'cles' => $changes])->assertOk();

    expect($miseAJour->json('elements'))->toHaveCount(1)
        ->and(strlen((string) gzencode($miseAJour->getContent())) + strlen((string) gzencode(json_encode($manifeste))))->toBeLessThan(20 * 1024);
});

test('la génération ne dépend pas de $fillable : elle marche aussi sous un seeder (protection levée)', function () {
    leconPubliee($this->notion);

    $pack = Model::unguarded(fn () => packDe($this->eleve));

    expect($pack->compte['lecons'])->toBe(1)
        ->and($pack->est_exemple)->toBeFalse();
});

test('un élément retiré disparaît du pack', function () {
    $lecon = leconPubliee($this->notion);
    $pack = packDe($this->eleve);
    expect(empreintes($pack))->toHaveKey("lecon:{$lecon->uuid}");

    app(ContenuService::class)->archiver($lecon, User::factory()->avecRole(Role::AdminContenu)->create());

    expect(empreintes($pack->refresh()))->not->toHaveKey("lecon:{$lecon->uuid}")
        ->and($pack->compte['lecons'])->toBe(0);
});

test('morceaux : un morceau d\'une version dépassée répond 409 avec la nouvelle version', function () {
    leconPubliee($this->notion);
    $pack = packDe($this->eleve);
    $this->actingAs($this->eleve)->postJson(route('eleve.packs.prendre', $pack))->assertOk()
        ->assertJsonPath('version', $pack->version)
        ->assertJsonPath('morceaux', 1)
        ->assertJsonPath('titre', 'Mathématiques · BEPC');

    $morceau = $this->get(route('eleve.packs.morceau', [$pack, 0]).'?version='.$pack->version)->assertOk()->assertHeader('Cache-Control', 'no-store, private');
    expect(collect($morceau->json('elements'))->pluck('cle'))->toContain('matiere:bepc-maths');

    $this->getJson(route('eleve.packs.morceau', [$pack, 0]).'?version=0000000000000000')
        ->assertStatus(409)->assertJsonPath('version', $pack->version);
    $this->getJson(route('eleve.packs.morceau', [$pack, 7]).'?version='.$pack->version)->assertNotFound();
});

test('PackService découpe en morceaux d\'environ 500 Ko', function () {
    // Une leçon pèse 100 Ko au plus (BlocsContenu) : huit leçons de 90 Ko.
    foreach (range(1, 8) as $rang) {
        $texte = str_repeat("Une phrase de leçon assez longue numéro {$rang}. ", 1800);
        leconPubliee(notionDeTest("Notion {$rang}"), "Leçon {$rang}", ['type' => 'doc', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => $texte]]]]]);
    }

    $pack = packDe($this->eleve);
    $tailles = PackElement::where('pack_id', $pack->id)->get()->groupBy('morceau')->map->sum('taille');

    expect($pack->morceaux)->toBeGreaterThan(1)
        ->and($tailles->max())->toBeLessThan(PackService::TAILLE_MORCEAU + 200_000);
});

test('A.14 n° 9 — gratuit : un pack au choix ; pour en prendre un autre, il supprime le sien', function () {
    leconPubliee($this->notion);
    $maths = packDe($this->eleve);
    $francais = packDe($this->eleve, 'francais');
    $this->actingAs($this->eleve);

    $this->postJson(route('eleve.packs.prendre', $maths))->assertOk()->assertJsonPath('expire_le', null);
    $this->postJson(route('eleve.packs.prendre', $francais))->assertForbidden()
        ->assertJsonPath('message', 'Ton téléchargement gratuit est déjà pris par Mathématiques. Supprime-le pour en prendre un autre.');
    $this->getJson(route('eleve.packs.manifeste', $francais))->assertForbidden();

    $this->deleteJson(route('eleve.packs.retirer', $maths))->assertOk();
    $this->postJson(route('eleve.packs.prendre', $francais))->assertOk();
    $this->getJson(route('eleve.packs.manifeste', $maths))->assertForbidden();
});

test('A.14 n° 9 — un pack hors de son examen n\'existe pas pour lui (404)', function () {
    $bac = eleveAvecProfil('BAC', 'SE');
    $packBac = packDe($bac);

    $this->actingAs($this->eleve);
    $this->postJson(route('eleve.packs.prendre', $packBac))->assertNotFound();
    $this->getJson(route('eleve.packs.manifeste', $packBac))->assertNotFound();
    $this->getJson(route('eleve.packs.morceau', [$packBac, 0]).'?version='.$packBac->version)->assertNotFound();
});

test('A.14 n° 9 — abonné : tous ses packs, expiration fin + 7 jours ; abonnement fini, pack expiré non mis à jour', function () {
    Carbon::setTestNow('2026-11-06 10:00');
    abonnerJusquau(CarbonImmutable::parse('2026-12-01 00:00'));
    leconPubliee($this->notion);
    $maths = packDe($this->eleve);
    $francais = packDe($this->eleve, 'francais');
    $this->actingAs($this->eleve);

    $this->postJson(route('eleve.packs.prendre', $maths))->assertOk()->assertJsonPath('expire_le', '2026-12-08T00:00:00Z');
    $this->postJson(route('eleve.packs.prendre', $francais))->assertOk();

    // L'abonnement se renouvelle : l'expiration avance à la synchronisation.
    abonnerJusquau(CarbonImmutable::parse('2027-01-01 00:00'));
    $this->getJson(route('eleve.packs.manifeste', $maths))->assertOk()->assertJsonPath('expire_le', '2027-01-08T00:00:00Z');

    // Plus d'abonnement, délai de grâce passé : plus de mise à jour.
    abonnerJusquau(null);
    Carbon::setTestNow('2027-01-09 10:00');
    $this->getJson(route('eleve.packs.manifeste', $maths))->assertForbidden()
        ->assertJsonPath('message', 'Ton abonnement est terminé : ce pack n\'est plus mis à jour.');
    $this->getJson(route('eleve.packs.morceau', [$maths, 0]).'?version='.$maths->version)->assertForbidden();
});

test('le battement annonce seulement les packs qui ont changé, en moins de 1 Ko', function () {
    $lecon = leconPubliee($this->notion);
    $pack = packDe($this->eleve);
    $jeton = appareilDe($this->eleve);
    $this->actingAs($this->eleve)->postJson(route('eleve.packs.prendre', $pack))->assertOk();
    $ancienne = $pack->version;

    $etat = fn () => $this->withHeaders(['X-Appareil' => $jeton, 'X-Packs' => "bepc-maths@{$ancienne},bac-se-maths@x,inconnu@y"])
        ->getJson(route('sync.etat'))->assertOk();

    expect($etat()->json('packs'))->toBe(['bac-se-maths' => null, 'inconnu' => null]);

    leconPubliee(notionDeTest('Une autre notion'), 'Une autre leçon');
    $reponse = $etat();

    expect($reponse->json('packs.bepc-maths'))->toBe(['version' => $pack->refresh()->version, 'expire_le' => null])
        ->and($pack->version)->not->toBe($ancienne)
        ->and(strlen($reponse->getContent()))->toBeLessThan(1024)
        ->and($lecon->uuid)->toBeString();
});

test('l\'écran Téléchargements : un pack par matière de l\'élève, poids, place gratuite', function () {
    leconPubliee($this->notion);
    packDe($this->eleve);

    $this->actingAs($this->eleve)->get(route('eleve.telechargements'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('eleve/telechargements')
            ->where('abonne', false)
            ->where('gratuits', 1)
            ->where('gratuit', null)
            ->where('packs.0.cle', 'bepc-maths')
            ->where('packs.0.pret', true)
            ->where('packs.0.permis', true)
            ->where('packs.0.compte.lecons', 1)
            ->has('packs', CatalogueEleve::epreuves(CatalogueEleve::profil($this->eleve))->count()));

    expect(Pack::count())->toBe(CatalogueEleve::epreuves(CatalogueEleve::profil($this->eleve))->count());
});

test('la page d\'une matière nomme son pack et ses sujets', function () {
    leconPubliee($this->notion);
    $annale = annalePubliee(Examen::where('code', 'BEPC')->sole(), null, Matiere::where('slug', 'maths')->sole(), 2023, [$this->notion]);
    packDe($this->eleve);

    $this->actingAs($this->eleve)->get(route('eleve.cours.matiere', 'maths'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('pack.cle', 'bepc-maths')
            ->where('annales.0.uuid', $annale->uuid));
});

test('trois séances préparées de plus par matière téléchargée (A.10)', function () {
    foreach (range(1, 6) as $_) {
        questionDeTest($this->notion);
    }

    $instantane = $this->actingAs($this->eleve)->getJson(route('eleve.instantane').'?matieres=maths,philosophie')->assertOk()->json();

    expect($instantane['seances'])->toHaveCount(3)
        ->and(array_keys($instantane['seances_matieres']))->toBe(['maths'])
        ->and($instantane['seances_matieres']['maths'])->not->toBeEmpty()
        ->and(collect($instantane['seances_matieres']['maths'])->pluck('uuid')->intersect(collect($instantane['seances'])->pluck('uuid')))->toBeEmpty();

    // Stables d'un appel à l'autre.
    $encore = $this->getJson(route('eleve.instantane').'?matieres=maths')->json('seances_matieres.maths');
    expect(collect($encore)->pluck('uuid')->all())->toBe(collect($instantane['seances_matieres']['maths'])->pluck('uuid')->all());
});

test('Serie et Examen inutilisés ne cassent rien : un Bac SE a ses propres packs', function () {
    $bac = eleveAvecProfil('BAC', 'SE');

    expect(packDe($bac)->cle)->toBe('bac-se-maths')
        ->and(Serie::where('code', 'SE')->exists())->toBeTrue();
});
