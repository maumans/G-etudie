<?php

namespace App\Http\Controllers\Compte;

use App\Enums\MotifCode;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Rules\TelephoneGuineen;
use App\Services\CodeSmsService;
use App\Support\JournalAcces;
use App\Support\ReglesCompte;
use App\Support\Telephone;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Fortify\Fortify;

/**
 * Mot de passe oublié (D3) : un code SMS au numéro du compte, puis un nouveau
 * mot de passe. Seuls les numéros vérifiés reçoivent un code ; la réponse est
 * la même que le numéro existe ou non (rien ne dit si un compte existe).
 * Le numéro voyage en session, jamais dans l'adresse.
 */
class RecuperationController extends Controller
{
    private const CLE_SESSION = 'recuperation.telephone';

    public function __construct(private CodeSmsService $codes) {}

    public function create(): Response
    {
        return Inertia::render('auth/mot-de-passe-oublie');
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate(['telephone' => ['required', 'string', new TelephoneGuineen]]);
        $telephone = (string) Telephone::normaliser($request->string('telephone')->toString());

        $user = User::where('telephone', $telephone)->first();

        if ($user !== null && $user->telephoneVerifie() && ! $user->estDesactive()) {
            $this->codes->envoyer($telephone, MotifCode::Recuperation, $user);
        }

        $request->session()->put(self::CLE_SESSION, $telephone);

        return to_route('compte.recuperation.code');
    }

    public function code(Request $request): Response|RedirectResponse
    {
        $telephone = $request->session()->get(self::CLE_SESSION);

        if (! is_string($telephone)) {
            return to_route('compte.recuperation.create');
        }

        return Inertia::render('auth/code-recuperation', [
            'numeroMasque' => Telephone::masquer($telephone),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $telephone = $request->session()->get(self::CLE_SESSION);

        if (! is_string($telephone)) {
            return to_route('compte.recuperation.create');
        }

        $request->validate([
            'code' => ['required', 'string', 'size:'.CodeSmsService::LONGUEUR],
            'password' => ReglesCompte::motDePasse(),
        ]);

        $this->codes->verifier($telephone, MotifCode::Recuperation, $request->string('code')->toString());

        $user = User::where('telephone', $telephone)->firstOrFail();
        $user->update(['password' => $request->string('password')->toString()]);

        $request->session()->forget(self::CLE_SESSION);
        Auth::login($user);
        $request->session()->regenerate();

        JournalAcces::consigner('mot_de_passe.recupere', $user, auteur: $user);
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Ton mot de passe est changé.']);

        return redirect(Fortify::redirects('login'));
    }
}
