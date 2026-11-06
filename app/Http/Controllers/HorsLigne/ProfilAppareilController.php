<?php

namespace App\Http\Controllers\HorsLigne;

use App\Http\Controllers\Controller;
use App\Http\Middleware\OrdinateurPartage;
use App\Http\Middleware\SessionCourtePersonnel;
use App\Services\HorsLigne\AppareilService;
use App\Support\JournalAcces;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * Profils d'un même téléphone (HORS_LIGNE.md A.7, HL6).
 *
 * - `basculer` : passer à un autre profil du téléphone sans mot de passe.
 *   L'appareil a vérifié le code local à 4 chiffres ; le serveur vérifie le
 *   jeton de ce profil sur cet appareil (30 jours glissants). Ouvert sans
 *   session (la session peut être celle d'un frère, ou expirée), limité en
 *   débit. Jamais pour le personnel (AppareilService).
 * - `retirer` : le profil quitte ce téléphone (« Se déconnecter ») ; son jeton
 *   ne vaut plus.
 */
class ProfilAppareilController extends Controller
{
    public function __construct(private AppareilService $appareils) {}

    public function basculer(Request $request): JsonResponse
    {
        $donnees = $request->validate([
            'appareil' => ['required', 'string', 'max:128'],
            'profil' => ['required', 'integer'],
            'jeton' => ['required', 'string', 'max:128'],
        ]);

        $appareil = $this->appareils->retrouver($donnees['appareil']);
        $profil = $appareil === null ? null : $this->appareils->profilParJeton($appareil, (int) $donnees['profil'], $donnees['jeton']);

        // Une seule réponse pour toutes les causes : on n'apprend rien
        // d'un essai (appareil inconnu, profil retiré, jeton usé).
        if ($profil === null) {
            return response()->json(['message' => 'Ce profil doit se reconnecter avec son mot de passe.'], 422);
        }

        if ($request->user()?->isNot($profil)) {
            Auth::guard('web')->logout();
        }

        Auth::guard('web')->login($profil);
        $request->session()->regenerate();
        $request->session()->put(SessionCourtePersonnel::CLE, now()->getTimestamp());
        $request->session()->forget(OrdinateurPartage::CLE);
        JournalAcces::consigner('profil.bascule', $appareil, ['appareil' => $appareil->libelle], $profil);

        return response()->json(['utilisateur' => ['id' => $profil->getKey()]])->header('Cache-Control', 'no-store');
    }

    public function retirer(Request $request): JsonResponse
    {
        $donnees = $request->validate(['appareil' => ['required', 'string', 'max:128']]);
        $appareil = $this->appareils->retrouver($donnees['appareil']);

        if ($appareil !== null) {
            $this->appareils->retirerProfil($appareil, $request->user());
        }

        return response()->json(['retire' => true])->header('Cache-Control', 'no-store');
    }
}
