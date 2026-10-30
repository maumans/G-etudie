<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    /**
     * Sous `npm run dev` (fichier public/hot), le manifeste du build n'a rien à
     * voir avec ce que charge le navigateur : un `npm run build` lancé en
     * parallèle ferait repartir chaque navigation en 409. La vérification de
     * version reste active en production (CLAUDE.md § 4).
     */
    public function version(Request $request): ?string
    {
        if (is_file(public_path('hot'))) {
            return null;
        }

        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'name' => config('app.name'),
            // Données minimales (PLAN § 10) : chaque page reçoit le prénom, le
            // pseudo et si le numéro est vérifié — jamais le numéro lui-même.
            'auth' => [
                'user' => $request->user() ? [
                    ...$request->user()->only(['id', 'prenom', 'pseudo']),
                    'numero_verifie' => $request->user()->telephoneVerifie(),
                ] : null,
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }
}
