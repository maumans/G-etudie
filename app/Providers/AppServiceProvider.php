<?php

namespace App\Providers;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;
use Inertia\ExceptionResponse;
use Inertia\Inertia;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
        $this->configurerPagesErreur();
    }

    /**
     * Pages d'erreur en français, dans l'application (page Inertia `erreur`),
     * au lieu des pages anglaises de Laravel. Une erreur 500 garde la page de
     * débogage tant que APP_DEBUG est actif.
     */
    protected function configurerPagesErreur(): void
    {
        Inertia::handleExceptionsUsing(function (ExceptionResponse $reponse) {
            $statut = $reponse->statusCode();

            if (! in_array($statut, [403, 404, 419, 429, 500, 503], true)) {
                return null;
            }

            if ($statut === 500 && config('app.debug')) {
                return null;
            }

            return $reponse->render('erreur', ['statut' => $statut])->withSharedData();
        });
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
