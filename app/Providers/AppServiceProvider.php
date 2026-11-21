<?php

namespace App\Providers;

use App\Models\Lecon;
use App\Models\Question;
use App\Models\Sujet;
use App\Services\AbonnementService;
use App\Services\Annales\ExtracteurClaude;
use App\Services\Annales\ExtracteurSimule;
use App\Services\Annales\ExtracteurSujet;
use App\Services\HorsLigne\RegistreOperations;
use App\Services\PackService;
use App\Services\Sms\EnvoiSms;
use App\Services\Sms\JournalSms;
use App\Services\Tuteur\MoteurTuteur;
use App\Services\Tuteur\TuteurClaude;
use App\Services\Tuteur\TuteurSimule;
use App\Ssr\PasserelleVitrine;
use App\Support\Abonnements\SourceAbonnements;
use Carbon\CarbonImmutable;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;
use Inertia\ExceptionResponse;
use Inertia\Inertia;
use Inertia\Ssr\Gateway;

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

        // Import assisté des sujets (lot 4) : l'API Claude, ou la lecture
        // simulée hors production (config/annales.php).
        $this->app->bind(ExtracteurSujet::class, fn () => config('annales.extracteur') === 'claude'
            ? new ExtracteurClaude
            : new ExtracteurSimule);

        // Tuteur N'karamögö (lot 10) : l'API Claude, ou le tuteur simulé hors
        // production (config/tuteur.php).
        $this->app->bind(MoteurTuteur::class, fn () => config('tuteur.moteur') === 'claude'
            ? new TuteurClaude
            : new TuteurSimule(app()->runningUnitTests() ? 0 : 25_000));

        // Une seule liste des types d'opération hors ligne par requête.
        $this->app->singleton(RegistreOperations::class);

        // Lot 9 : les abonnements (paiements, codes prépayés) ; DroitsPacks et
        // DroitsAbonne ne lisent que cette interface.
        $this->app->bind(SourceAbonnements::class, AbonnementService::class);

        // Rendu serveur (lot 8) : la vitrine seulement (Habillages::renduServeur).
        $this->app->bind(Gateway::class, PasserelleVitrine::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
        $this->configurerPagesErreur();

        // La file d'opérations a son propre compteur. Un `throttle:120,1`
        // anonyme partageait celui de l'utilisateur avec les autres routes
        // limitées (`throttle:6,1` de « Mon compte ») : un élève qui venait
        // de faire sa séance ne pouvait plus supprimer son compte (429).
        RateLimiter::for('synchro', fn (Request $request) => Limit::perMinute(120)
            ->by('synchro|'.($request->user()?->getAuthIdentifier() ?? $request->ip())));

        // Lot 9 : essais de codes prépayés (deviner un code), par compte et par adresse.
        RateLimiter::for('code-acces', fn (Request $request) => [
            Limit::perMinutes(15, 8)->by('code|'.($request->user()?->getAuthIdentifier() ?? 'invite')),
            Limit::perHour(30)->by('code-ip|'.$request->ip()),
        ]);

        // Lot 9 : lancements de paiement (chacun sonne le téléphone du payeur).
        RateLimiter::for('paiement', fn (Request $request) => Limit::perMinutes(10, 5)
            ->by('paiement|'.($request->user()?->getAuthIdentifier() ?? $request->ip())));

        // Lot 9 : webhooks des opérateurs.
        RateLimiter::for('webhook-paiement', fn (Request $request) => Limit::perMinute(120)->by('webhook|'.$request->ip()));

        // Lot 10 : demandes au tuteur (chacune peut coûter un appel à l'API).
        // Le quota du jour est l'affaire de TuteurService ; ceci arrête une
        // rafale (double appui, script).
        RateLimiter::for('tuteur', fn (Request $request) => Limit::perMinute(8)
            ->by('tuteur|'.($request->user()?->getAuthIdentifier() ?? $request->ip())));

        RateLimiter::for('basculer-profil', fn (Request $request) => Limit::perMinute(10)
            ->by('basculer|'.$request->ip()));

        // Lot 11 : codes de liaison parent (six chiffres) et codes de groupe :
        // deviner un code ne doit pas être possible.
        RateLimiter::for('code-liaison', fn (Request $request) => [
            Limit::perMinutes(15, 8)->by('liaison|'.($request->user()?->getAuthIdentifier() ?? 'invite')),
            Limit::perHour(30)->by('liaison-ip|'.$request->ip()),
        ]);
        RateLimiter::for('code-groupe', fn (Request $request) => [
            Limit::perMinutes(15, 10)->by('groupe|'.($request->user()?->getAuthIdentifier() ?? 'invite')),
            Limit::perHour(40)->by('groupe-ip|'.$request->ip()),
        ]);

        // Lot 12 : le fil d'un groupe (le service limite aussi : 10 par jour,
        // une toutes les 30 s ; ce filet arrête un envoi en rafale).
        RateLimiter::for('fil', fn (Request $request) => [
            Limit::perMinute(6)->by('fil|'.($request->user()?->getAuthIdentifier() ?? 'invite')),
        ]);

        $this->regenererLesPacks();

        // Noms courts et stables dans les colonnes polymorphes
        // (`versions_contenu.contenu_type`). Carte non imposée : les rôles de
        // spatie gardent le nom de classe de User dans `model_has_roles`.
        Relation::morphMap([
            'lecon' => Lecon::class,
            'sujet' => Sujet::class,
        ]);
    }

    /**
     * Lot 7 (HORS_LIGNE.md A.5) : une leçon, une question ou un sujet
     * publiée, retirée ou corrigée fait regénérer (en file) les packs de sa
     * matière. Seuls les champs qui changent ce que voit l'élève comptent.
     */
    protected function regenererLesPacks(): void
    {
        $champs = ['version_publiee_id', 'statut'];
        $relancer = fn (?int $matiereId) => $matiereId === null ? null : app(PackService::class)->aRegenerer($matiereId);

        Lecon::saved(function (Lecon $lecon) use ($champs, $relancer) {
            if ($lecon->wasChanged($champs) || $lecon->wasRecentlyCreated) {
                $relancer($lecon->notion->chapitre->matiere_id);
            }
        });
        Question::saved(function (Question $question) use ($champs, $relancer) {
            if ($question->wasChanged($champs) || $question->wasRecentlyCreated) {
                $relancer($question->notion->chapitre->matiere_id);
            }
        });
        Sujet::saved(function (Sujet $sujet) use ($champs, $relancer) {
            if ($sujet->wasChanged($champs) || $sujet->wasRecentlyCreated) {
                $relancer($sujet->matiere_id);
            }
        });
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
