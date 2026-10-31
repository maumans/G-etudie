<?php

use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\SessionCourtePersonnel;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);

        // Un compte connecté qui ouvre une page d'invité (connexion,
        // inscription) est renvoyé dans son espace.
        $middleware->redirectUsersTo('/accueil');

        // Un document de blocs (leçon, question) garde ses espaces et ses
        // chaînes vides : « Dans un triangle » + « rectangle » en gras
        // perdrait son espace, une proposition faite d'une seule formule
        // (texte vide) deviendrait `null` (DEVBOOK point 17). Ces middlewares
        // passent avant le routeur : on reconnaît la requête à son adresse.
        $documents = fn (Request $request) => $request->isMethod('PUT') && $request->is('contenu/lecons/*', 'contenu/questions/*');
        $middleware->trimStrings(except: [$documents]);
        $middleware->convertEmptyStringsToNull(except: [$documents]);

        $middleware->web(append: [
            SessionCourtePersonnel::class,
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
