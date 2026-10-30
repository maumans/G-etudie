<?php

namespace App\Http\Controllers\Compte;

use App\Enums\MotifCode;
use App\Http\Controllers\Controller;
use App\Services\CodeSmsService;
use App\Support\JournalAcces;
use App\Support\ReglesCompte;
use App\Support\Telephone;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * « Mon compte » (CLAUDE.md § 4, « fonction souvent oubliée ») : chacun
 * change lui-même son profil, son mot de passe et son numéro, et peut
 * supprimer son compte (DA5). Chaque changement sensible est journalisé.
 */
class MonCompteController extends Controller
{
    private const CLE_NOUVEAU_NUMERO = 'compte.nouveau_numero';

    public function __construct(private CodeSmsService $codes) {}

    public function profil(Request $request): Response
    {
        return Inertia::render('compte/profil', [
            'profil' => $request->user()->only(['prenom', 'pseudo']),
            // Un compte qui a signé du contenu garde sa signature (lot 1).
            'suppression_possible' => ! $request->user()->aSigneDuContenu(),
        ]);
    }

    public function mettreAJourProfil(Request $request): RedirectResponse
    {
        $user = $request->user();

        $user->update($request->validate([
            'prenom' => ReglesCompte::prenom(),
            'pseudo' => ReglesCompte::pseudo($user),
        ]));

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Profil enregistré.']);

        return to_route('compte.profil.edit');
    }

    public function motDePasse(): Response
    {
        return Inertia::render('compte/mot-de-passe');
    }

    public function changerMotDePasse(Request $request): RedirectResponse
    {
        $request->validate([
            'current_password' => ['required', 'string', 'current_password'],
            'password' => ReglesCompte::motDePasse(),
        ]);

        $user = $request->user();
        $user->update(['password' => $request->string('password')->toString()]);

        JournalAcces::consigner('mot_de_passe.change', $user);
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Mot de passe changé.']);

        return to_route('compte.mot-de-passe.edit');
    }

    public function numero(Request $request): Response
    {
        $user = $request->user();
        $enAttente = $request->session()->get(self::CLE_NOUVEAU_NUMERO);

        return Inertia::render('compte/numero', [
            'numeroMasque' => Telephone::masquer($user->telephone),
            'numeroVerifie' => $user->telephoneVerifie(),
            'nouveauNumeroMasque' => is_string($enAttente) ? Telephone::masquer($enAttente) : null,
        ]);
    }

    /** Étape 1 : nouveau numéro + mot de passe actuel → code SMS au nouveau numéro. */
    public function envoyerCodeNumero(Request $request): RedirectResponse
    {
        $user = $request->user();

        $donnees = validator(ReglesCompte::normaliserTelephone($request->all()), [
            'telephone' => ReglesCompte::telephone($user),
            'current_password' => ['required', 'string', 'current_password'],
        ])->validate();

        $this->codes->envoyer($donnees['telephone'], MotifCode::ChangementNumero, $user);
        $request->session()->put(self::CLE_NOUVEAU_NUMERO, $donnees['telephone']);

        return to_route('compte.numero.edit');
    }

    /** Étape 2 : le code reçu sur le nouveau numéro prouve qu'il appartient à l'élève. */
    public function changerNumero(Request $request): RedirectResponse
    {
        $nouveau = $request->session()->get(self::CLE_NOUVEAU_NUMERO);

        if (! is_string($nouveau)) {
            return to_route('compte.numero.edit');
        }

        $request->validate(['code' => ['required', 'string', 'size:'.CodeSmsService::LONGUEUR]]);
        $this->codes->verifier($nouveau, MotifCode::ChangementNumero, $request->string('code')->toString());

        $user = $request->user();
        $ancien = $user->telephone;

        // Revérifie l'unicité : le numéro a pu être pris entre les deux étapes.
        validator(['telephone' => $nouveau], ['telephone' => ReglesCompte::telephone($user)])->validate();

        $user->forceFill(['telephone' => $nouveau, 'telephone_verifie_le' => now()])->save();
        $request->session()->forget(self::CLE_NOUVEAU_NUMERO);

        JournalAcces::consigner('numero.change', $user, [
            'ancien' => Telephone::masquer($ancien),
            'nouveau' => Telephone::masquer($nouveau),
        ]);
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Ton numéro est changé.']);

        return to_route('compte.numero.edit');
    }

    public function annulerNumero(Request $request): RedirectResponse
    {
        $request->session()->forget(self::CLE_NOUVEAU_NUMERO);

        return to_route('compte.numero.edit');
    }

    public function affichage(): Response
    {
        return Inertia::render('compte/affichage');
    }

    public function supprimer(Request $request): RedirectResponse
    {
        $request->validate(['password' => ['required', 'string', 'current_password']]);

        $user = $request->user();

        // Une leçon signée garde son auteur et son relecteur (traçabilité des
        // corrigés) : le compte se désactive par un administrateur, il ne
        // s'efface pas lui-même.
        if ($user->aSigneDuContenu()) {
            throw ValidationException::withMessages([
                'password' => "Votre compte a signé des contenus : demandez à l'administrateur de le désactiver.",
            ]);
        }

        JournalAcces::consigner('compte.supprime', $user);

        Auth::logout();
        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
