<?php

namespace App\Http\Controllers;

use App\Services\Paiements\NotificationInvalide;
use App\Services\PaiementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Le webhook des opérateurs (lot 9) : `POST /paiements/notifications/{passerelle}`.
 * Sans compte ni jeton CSRF : c'est la **signature** qui fait foi
 * (PasserellePaiement::lireNotification). Signature fausse : 401, et rien
 * n'est enregistré. Sinon toujours 200 — y compris un webhook rejoué ou
 * pour un paiement inconnu —, pour que l'opérateur cesse de renvoyer.
 */
class NotificationPaiementController extends Controller
{
    public function __invoke(Request $request, string $passerelle, PaiementService $paiements): JsonResponse
    {
        try {
            $resultat = $paiements->traiterNotification($passerelle, $request);
        } catch (NotificationInvalide $e) {
            Log::warning('Webhook de paiement refusé : '.$e->getMessage(), ['passerelle' => $passerelle, 'ip' => $request->ip()]);

            return response()->json(['recu' => false], 401);
        }

        return response()->json(['recu' => true, 'resultat' => $resultat]);
    }
}
