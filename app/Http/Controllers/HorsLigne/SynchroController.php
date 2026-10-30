<?php

namespace App\Http\Controllers\HorsLigne;

use App\Http\Controllers\Controller;
use App\Services\HorsLigne\AppareilService;
use App\Services\HorsLigne\Horloge;
use App\Services\HorsLigne\SynchroService;
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

    /** Taille d'un lot, comme le moteur de l'appareil. */
    public const LOT_MAX = 50;

    public function __construct(
        private AppareilService $appareils,
        private SynchroService $synchro,
    ) {}

    /**
     * Battement de connectivité (≤ 1 Ko) : heure du serveur, jeton CSRF neuf,
     * compte connecté ; enregistre l'appareil au premier contact.
     */
    public function etat(Request $request): JsonResponse
    {
        $user = $request->user();
        $reconnu = $this->appareils->reconnaitre($request->header(self::ENTETE_APPAREIL), $user, (string) $request->userAgent());

        return response()->json([
            'heure_serveur' => now()->toIso8601ZuluString('millisecond'),
            'csrf' => csrf_token(),
            'utilisateur' => ['id' => $user->getKey()],
            'packs' => [],
            ...($reconnu['jeton'] !== null ? ['appareil' => $reconnu['jeton']] : []),
        ])->header('Cache-Control', 'no-store');
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

        $resultats = $this->synchro->traiter($request->user(), $appareil, $horloge, array_values($donnees['operations']));
        $appareil->forceFill(['dernier_contact_le' => now()])->save();

        return response()->json([
            'heure_serveur' => now()->toIso8601ZuluString('millisecond'),
            'resultats' => $resultats,
        ])->header('Cache-Control', 'no-store');
    }
}
