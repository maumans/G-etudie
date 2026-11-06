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

        $packs = CatalogueEleve::epreuves($profil)->map(function (Epreuve $epreuve) use ($eleve) {
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
                'version' => $pack->version,
                'genere_le' => $pack->genere_le?->toIso8601ZuluString(),
                'taille_octets' => $pack->taille_octets,
                'taille_sans_images' => $pack->taille_sans_images,
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

        return $this->json($this->packs->manifeste($pack, $pris->expire_le?->toImmutable()));
    }

    /** Manifeste pour reprendre ou mettre à jour un pack déjà pris. */
    public function manifeste(Request $request, Pack $pack): JsonResponse
    {
        $this->dansSonCatalogue($request, $pack);
        $verdict = $this->droits->pourMettreAJour($request->user(), $pack);

        if (! $verdict['permis']) {
            return $this->refus((string) $verdict['motif']);
        }

        return $this->json($this->packs->manifeste($pack, $verdict['expire_le']));
    }

    /** Un morceau d'une version donnée ; 409 si le pack a changé entre-temps. */
    public function morceau(Request $request, Pack $pack, int $numero): HttpResponse|JsonResponse
    {
        $refus = $this->autoriserLecture($request, $pack);

        if ($refus !== null) {
            return $refus;
        }

        if ($request->query('version') !== $pack->version) {
            return $this->versionChangee($pack);
        }

        abort_unless($numero >= 0 && $numero < $pack->morceaux, 404);

        return $this->brut($this->packs->morceau($pack, $numero));
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

        if ($donnees['version'] !== $pack->version) {
            return $this->versionChangee($pack);
        }

        return $this->brut($this->packs->elements($pack, array_values($donnees['cles'])));
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

    private function versionChangee(Pack $pack): JsonResponse
    {
        return response()->json([
            'message' => 'Ce pack vient d\'être mis à jour.',
            'version' => $pack->version,
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
