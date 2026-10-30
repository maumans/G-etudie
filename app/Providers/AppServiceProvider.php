<?php

namespace App\Providers;

use App\Services\HorsLigne\RegistreOperations;
use App\Services\Sms\EnvoiSms;
use App\Services\Sms\JournalSms;
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
        // Fournisseur SMS réel à choisir avant le lot 8 (D3) ; d'ici là, le
        // message est écrit dans le journal et rien ne part.
        $this->app->bind(EnvoiSms::class, JournalSms::class);

        // Une seule liste des types d'opération hors ligne par requête.
        $this->app->singleton(RegistreOperations::class);
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

        // D3 : 8 caractères au moins, sans règle de complexité — un élève doit
        // pouvoir le retenir. Pas de vérification de fuite (`uncompromised`) :
        // elle interroge un service tiers à chaque saisie, et une panne de ce
        // service bloquerait l'inscription.
        Password::defaults(fn (): Password => Password::min(8)->max(72));
    }
}
