<?php

namespace App\Providers;

use App\Actions\Fortify\CreateNewUser;
use App\Models\User;
use App\Support\Telephone;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Inertia\Inertia;
use Laravel\Fortify\Contracts\RegisterResponse;
use Laravel\Fortify\Fortify;

/**
 * Connexion par téléphone et mot de passe (D3). La récupération du mot de
 * passe et la vérification du numéro passent par des codes SMS, hors
 * Fortify (App\Http\Controllers\Compte).
 */
class FortifyServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Après l'inscription : proposer de vérifier le numéro, sans l'imposer.
        $this->app->instance(RegisterResponse::class, new class implements RegisterResponse
        {
            public function toResponse($request)
            {
                return redirect()->route('compte.verification.edit');
            }
        });
    }

    public function boot(): void
    {
        Fortify::createUsersUsing(CreateNewUser::class);

        // Le numéro saisi (« 622 12 34 56 », « +224… ») est normalisé avant
        // la recherche ; un compte désactivé ne se connecte pas.
        Fortify::authenticateUsing(function (Request $request): ?User {
            $telephone = Telephone::normaliser($request->string(Fortify::username())->toString());

            if ($telephone === null) {
                return null;
            }

            $user = User::where('telephone', $telephone)->first();

            if ($user === null || $user->estDesactive() || ! Hash::check($request->string('password')->toString(), $user->password)) {
                return null;
            }

            return $user;
        });

        $this->configurerVues();
        $this->configurerLimitations();
    }

    private function configurerVues(): void
    {
        Fortify::loginView(fn (Request $request) => Inertia::render('auth/connexion', [
            'statut' => $request->session()->get('status'),
        ]));

        Fortify::registerView(fn () => Inertia::render('auth/inscription'));

        Fortify::twoFactorChallengeView(fn () => Inertia::render('auth/two-factor-challenge'));

        Fortify::confirmPasswordView(fn () => Inertia::render('auth/confirm-password'));
    }

    private function configurerLimitations(): void
    {
        RateLimiter::for('two-factor', function (Request $request) {
            return Limit::perMinute(5)->by($request->session()->get('login.id'));
        });

        // 5 essais par minute pour un même numéro depuis une même adresse,
        // quelle que soit la façon dont le numéro a été tapé.
        RateLimiter::for('login', function (Request $request) {
            $saisie = $request->string(Fortify::username())->toString();
            $numero = Telephone::normaliser($saisie) ?? $saisie;

            return Limit::perMinute(5)->by($numero.'|'.$request->ip());
        });
    }
}
