<?php

namespace App\Http\Controllers\Eleve;

use App\Http\Controllers\Controller;
use App\Jobs\GenererPack;
use App\Models\Epreuve;
use App\Models\Pack;
use App\Services\PackService;
use App\Support\CatalogueEleve;
use App\Support\DroitsPacks;
use App\Support\PresentationCours;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Téléchargements (HORS_LIGNE.md A.5, HL5). L'écran est consultable hors
 * ligne (copie, et l'état local des packs lu sur l'appareil) ; télécharger et
 * mettre à jour demandent le réseau (niveau C, A.2).
 *
 * Les routes JSON (`prendre`, `manifeste`, `morceau`, `elements`) sont lues
 * par `lib/hors-ligne/packs.ts`. Un pack hors du catalogue de l'élève
 * répond 404 ; un pack qu'il n'a pas le droit de prendre ou de mettre à jour,
 * 403 avec une phrase à afficher (DroitsPacks).
 */
class PackController extends Controller
{
    public function __construct(
        private PackService $packs,
        private DroitsPacks $droits,
    ) {}

    public function index(Request $request): Response
    {
        $eleve = $request->user();
        $profil = CatalogueEleve::profil($eleve) ?? abort(404);
        $abonne = $this->droits->estAbonne($eleve);
        $gratuit = $this->droits->packGratuit($eleve);
        $variante = $this->droits->variante($eleve);

        $packs = CatalogueEleve::epreuves($profil)->map(function (Epreuve $epreuve) use ($eleve, $variante) {
            $pack = $this->packs->pour($epreuve)->load(['examen', 'serie', 'matiere']);

            // Jamais généré (contenu publié avant le lot 7, ou épreuve
            // nouvelle) : préparé en file, l'écran le dit.
            if (! $pack->estGenere()) {
                GenererPack::dispatch($pack->id);
            }

            $pris = $this->droits->pris($eleve, $pack);
            $prendre = $this->droits->pourPrendre($eleve, $pack);

            return [
                'cle' => $pack->cle,
                'titre' => $pack->titre(),
                'matiere' => PresentationCours::matiere($pack->matiere),
                'phare' => $epreuve->phare,
                'pret' => $pack->estGenere(),
                'version' => $pack->versionPour($variante),
                'genere_le' => $pack->genere_le?->toIso8601ZuluString(),
                'taille_octets' => $pack->taillePour($variante),
                'taille_sans_images' => $pack->taillePour($variante),
                'compte' => $pack->compte ?? ['lecons' => 0, 'fiches' => 0, 'annales' => 0],
                'est_exemple' => $pack->est_exemple,
                'pris' => $pris !== null,
                'expire_le' => $pris?->expire_le?->toIso8601ZuluString(),
                'permis' => $pris !== null || $prendre['permis'],
                'motif' => $pris !== null ? null : $prendre['motif'],
            ];
        })->values();

        return Inertia::render('eleve/telechargements', [
            'examen' => $profil->libelleExamen(),
            'abonne' => $abonne,
            'gratuits' => DroitsPacks::GRATUITS,
            'gratuit' => $gratuit?->pack->cle,
            // Lot 9 (HL-D8) : un abonné ouvert sur trop d'appareils le lit ici.
            'motif_appareils' => $abonne ? $this->droits->motifAppareils($eleve) : null,
            'packs' => $packs,
        ]);
    }

    /** Premier téléchargement : le pack est pris (place gratuite), le manifeste rendu. */
    public function prendre(Request $request, Pack $pack): JsonResponse
    {
        $this->dansSonCatalogue($request, $pack);
        if (! $pack->estGenere()) {
            return $this->refus('Ce pack est en préparation. Réessaie dans quelques minutes.', 409);
        }

        $verdict = $this->droits->pourPrendre($request->user(), $pack);

        if (! $verdict['permis']) {
            return $this->refus((string) $verdict['motif']);
        }

        $pris = $this->droits->prendre($request->user(), $pack);

        return $this->json($this->packs->manifeste($pack, $pris->expire_le?->toImmutable(), $this->droits->variante($request->user())));
    }

    /** Manifeste pour reprendre ou mettre à jour un pack déjà pris. */
    public function manifeste(Request $request, Pack $pack): JsonResponse
    {
        $this->dansSonCatalogue($request, $pack);
        $verdict = $this->droits->pourMettreAJour($request->user(), $pack);

        if (! $verdict['permis']) {
            return $this->refus((string) $verdict['motif']);
        }

        return $this->json($this->packs->manifeste($pack, $verdict['expire_le'], $this->droits->variante($request->user())));
    }

    /** Un morceau d'une version donnée ; 409 si le pack a changé entre-temps. */
    public function morceau(Request $request, Pack $pack, int $numero): HttpResponse|JsonResponse
    {
        $refus = $this->autoriserLecture($request, $pack);

        if ($refus !== null) {
            return $refus;
        }

        $variante = $this->droits->variante($request->user());

        if ($request->query('version') !== $pack->versionPour($variante)) {
            return $this->versionChangee($pack, $variante);
        }

        abort_unless($numero >= 0 && $numero < $pack->morceaux, 404);

        return $this->brut($this->packs->morceau($pack, $numero, $variante));
    }

    /** Mise à jour différentielle : seulement les éléments demandés (A.5). */
    public function elements(Request $request, Pack $pack): HttpResponse|JsonResponse
    {
        $refus = $this->autoriserLecture($request, $pack);

        if ($refus !== null) {
            return $refus;
        }

        $donnees = $request->validate([
            'version' => ['required', 'string', 'size:16'],
            'cles' => ['required', 'array', 'max:200'],
            'cles.*' => ['string', 'max:120'],
        ]);

        $variante = $this->droits->variante($request->user());

        if ($donnees['version'] !== $pack->versionPour($variante)) {
            return $this->versionChangee($pack, $variante);
        }

        return $this->brut($this->packs->elements($pack, array_values($donnees['cles']), $variante));
    }

    /** Supprimé du téléphone : la place gratuite se libère (HL-D3). */
    public function retirer(Request $request, Pack $pack): JsonResponse
    {
        $this->dansSonCatalogue($request, $pack);
        $this->droits->retirer($request->user(), $pack);

        return $this->json(['retire' => true]);
    }

    private function dansSonCatalogue(Request $request, Pack $pack): void
    {
        abort_unless($this->droits->estDansSonCatalogue($request->user(), $pack), 404);
    }

    /** Un refus à afficher tel quel à l'élève, ou `null` s'il peut lire ce pack. */
    private function autoriserLecture(Request $request, Pack $pack): ?JsonResponse
    {
        $this->dansSonCatalogue($request, $pack);
        $verdict = $this->droits->pourMettreAJour($request->user(), $pack);

        return $verdict['permis'] ? null : $this->refus((string) $verdict['motif']);
    }

    private function refus(string $motif, int $statut = 403): JsonResponse
    {
        return response()->json(['message' => $motif], $statut)->header('Cache-Control', 'no-store');
    }

    /**
     * Le pack a changé, ou l'élève a changé de variante (abonnement pris ou
     * terminé) : l'appareil repart du nouveau manifeste.
     */
    private function versionChangee(Pack $pack, string $variante): JsonResponse
    {
        return response()->json([
            'message' => 'Ce pack vient d\'être mis à jour.',
            'version' => $pack->versionPour($variante),
        ], 409)->header('Cache-Control', 'no-store');
    }

    /** @param array<string, mixed> $donnees */
    private function json(array $donnees): JsonResponse
    {
        return response()->json($donnees)->header('Cache-Control', 'no-store');
    }

    private function brut(string $json): HttpResponse
    {
        return response($json, 200, [
            'Content-Type' => 'application/json',
            'Cache-Control' => 'no-store',
        ]);
    }
}
