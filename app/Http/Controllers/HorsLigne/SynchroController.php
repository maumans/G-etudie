<?php

namespace App\Http\Controllers\HorsLigne;

use App\Http\Controllers\Controller;
use App\Http\Middleware\OrdinateurPartage;
use App\Models\Pack;
use App\Services\HorsLigne\AppareilService;
use App\Services\HorsLigne\Horloge;
use App\Services\HorsLigne\SynchroService;
use App\Support\DroitsPacks;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Synchronisation de la file d'opérations (HORS_LIGNE.md A.3.6). Routes
 * authentifiées sans `can:` : l'autorisation se fait **par opération**
 * (AccesParRoleTest::OUVERTES_A_TOUS).
 */
class SynchroController extends Controller
{
    public const ENTETE_APPAREIL = 'X-Appareil';

    /** Jeton du profil connecté sur ce téléphone (HL6). */
    public const ENTETE_PROFIL = 'X-Profil';

    /** Packs présents sur l'appareil : « cle@version,… » (A.5). */
    public const ENTETE_PACKS = 'X-Packs';

    /** Taille d'un lot, comme le moteur de l'appareil. */
    public const LOT_MAX = 50;

    public function __construct(
        private AppareilService $appareils,
        private SynchroService $synchro,
        private DroitsPacks $droits,
    ) {}

    /**
     * Battement de connectivité (≤ 1 Ko) : heure du serveur, jeton CSRF neuf,
     * compte connecté ; enregistre l'appareil au premier contact.
     */
    public function etat(Request $request): JsonResponse
    {
        $user = $request->user();
        $reconnu = $this->appareils->reconnaitre(
            $request->header(self::ENTETE_APPAREIL),
            $user,
            (string) $request->userAgent(),
            $request->header(self::ENTETE_PROFIL),
            (bool) $request->session()->get(OrdinateurPartage::CLE, false),
        );

        return response()->json([
            'heure_serveur' => now()->toIso8601ZuluString('millisecond'),
            'csrf' => csrf_token(),
            'utilisateur' => ['id' => $user->getKey()],
            'packs' => (object) $this->versionsDesPacks($request),
            ...($reconnu['jeton'] !== null ? ['appareil' => $reconnu['jeton']] : []),
            ...($reconnu['jeton_profil'] !== null ? ['jeton_profil' => $reconnu['jeton_profil']] : []),
        ])->header('Cache-Control', 'no-store');
    }

    /**
     * Version courante (et expiration) des packs que l'appareil dit avoir,
     * seulement ceux qui ont changé ou qui expirent : le battement reste
     * sous 1 Ko (A.11). `null` : le pack n'existe plus pour cet élève.
     *
     * @return array<string, array{version: string|null, expire_le: string|null}|null>
     */
    private function versionsDesPacks(Request $request): array
    {
        $annonces = [];

        foreach (array_slice(explode(',', (string) $request->header(self::ENTETE_PACKS)), 0, 20) as $paire) {
            [$cle, $version] = array_pad(explode('@', trim($paire), 2), 2, '');

            if ($cle !== '') {
                $annonces[$cle] = $version;
            }
        }

        if ($annonces === []) {
            return [];
        }

        $reponse = [];
        $packs = Pack::query()->whereIn('cle', array_keys($annonces))->get()->keyBy('cle');

        foreach ($annonces as $cle => $version) {
            $pack = $packs->get($cle);

            if ($pack === null || ! $this->droits->estDansSonCatalogue($request->user(), $pack)) {
                $reponse[$cle] = null;

                continue;
            }

            $expireLe = $this->droits->pris($request->user(), $pack)?->expire_le?->toIso8601ZuluString();

            if ($pack->version !== $version || $expireLe !== null) {
                $reponse[$cle] = ['version' => $pack->version, 'expire_le' => $expireLe];
            }
        }

        return $reponse;
    }

    public function operations(Request $request): JsonResponse
    {
        $donnees = $request->validate([
            'appareil' => ['required', 'string', 'max:128'],
            'decalage_horloge_ms' => ['nullable', 'integer'],
            'mesure_le' => ['nullable', 'date'],
            'envoye_le' => ['nullable', 'date'],
            'operations' => ['required', 'array', 'max:'.self::LOT_MAX],
            'operations.*' => ['array'],
            'profils' => ['nullable', 'array', 'max:4'],
            'profils.*' => ['string', 'max:128'],
        ]);

        $appareil = $this->appareils->retrouver($donnees['appareil']);

        // Appareil inconnu ou révoqué : l'appareil refera `GET /sync/etat`.
        if ($appareil === null) {
            return response()->json(['message' => 'Appareil inconnu.'], 409);
        }

        $horloge = new Horloge(
            decalageMs: $donnees['decalage_horloge_ms'] ?? null,
            mesureLe: isset($donnees['mesure_le']) ? CarbonImmutable::parse($donnees['mesure_le']) : null,
            envoyeLe: isset($donnees['envoye_le']) ? CarbonImmutable::parse($donnees['envoye_le']) : null,
        );

        $resultats = $this->synchro->traiter($request->user(), $appareil, $horloge, array_values($donnees['operations']), $donnees['profils'] ?? []);
        $appareil->forceFill(['dernier_contact_le' => now()])->save();

        return response()->json([
            'heure_serveur' => now()->toIso8601ZuluString('millisecond'),
            'resultats' => $resultats,
        ])->header('Cache-Control', 'no-store');
    }
}
