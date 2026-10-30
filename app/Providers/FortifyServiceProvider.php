<?php

namespace App\Providers;

use App\Actions\Fortify\ActiverDoubleAuthentification;
use App\Actions\Fortify\CreateNewUser;
use App\Http\Middleware\SessionCourtePersonnel;
use App\Models\User;
use App\Support\JournalAcces;
use App\Support\Telephone;
use Illuminate\Auth\Events\Login;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Inertia\Inertia;
use Laravel\Fortify\Actions\EnableTwoFactorAuthentication;
use Laravel\Fortify\Contracts\RegisterResponse;
use Laravel\Fortify\Events\RecoveryCodesGenerated;
use Laravel\Fortify\Events\TwoFactorAuthenticationConfirmed;
use Laravel\Fortify\Events\TwoFactorAuthenticationDisabled;
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

        // Double authentification réservée au personnel (DA4), gardée au geste.
        $this->app->bind(EnableTwoFactorAuthentication::class, ActiverDoubleAuthentification::class);
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
        $this->configurerEcouteurs();
    }

    private function configurerEcouteurs(): void
    {
        // Point de départ des 12 h du personnel (SessionCourtePersonnel).
        Event::listen(function (Login $evenement) {
            if (request()->hasSession()) {
                request()->session()->put(SessionCourtePersonnel::CLE, now()->getTimestamp());
            }
        });

        // Journal des accès sensibles (CLAUDE.md § 9).
        Event::listen(fn (TwoFactorAuthenticationConfirmed $evenement) => JournalAcces::consigner('double_authentification.activee', $evenement->user));
        Event::listen(fn (TwoFactorAuthenticationDisabled $evenement) => JournalAcces::consigner('double_authentification.desactivee', $evenement->user));
        Event::listen(fn (RecoveryCodesGenerated $evenement) => JournalAcces::consigner('double_authentification.codes_regeneres', $evenement->user));
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
