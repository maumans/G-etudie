<?php

namespace App\Http\Controllers\Compte;

use App\Enums\MotifCode;
use App\Http\Controllers\Controller;
use App\Services\CodeSmsService;
use App\Support\JournalAcces;
use App\Support\Telephone;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Vérification du numéro par code SMS (D3) : proposée juste après
 * l'inscription, jamais imposée pour commencer à réviser ; exigée pour la
 * récupération par SMS, et plus tard pour le paiement et la liaison parent.
 */
class VerificationNumeroController extends Controller
{
    public function __construct(private CodeSmsService $codes) {}

    public function edit(Request $request): Response|RedirectResponse
    {
        $user = $request->user();

        if ($user->telephoneVerifie()) {
            return to_route('eleve.accueil');
        }

        return Inertia::render('auth/verifier-numero', [
            'numeroMasque' => Telephone::masquer($user->telephone),
            'codeEnvoye' => (bool) $request->session()->get('verification.code_envoye', false),
        ]);
    }

    public function envoyer(Request $request): RedirectResponse
    {
        $user = $request->user();

        $this->codes->envoyer($user->telephone, MotifCode::Verification, $user, champ: 'code');
        $request->session()->put('verification.code_envoye', true);

        return back();
    }

    public function confirmer(Request $request): RedirectResponse
    {
        $request->validate(['code' => ['required', 'string', 'size:'.CodeSmsService::LONGUEUR]]);
        $user = $request->user();

        $this->codes->verifier($user->telephone, MotifCode::Verification, $request->string('code')->toString());

        $user->forceFill(['telephone_verifie_le' => now()])->save();
        $request->session()->forget('verification.code_envoye');

        JournalAcces::consigner('numero.verifie', $user);
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Ton numéro est vérifié.']);

        return to_route('eleve.accueil');
    }
}
