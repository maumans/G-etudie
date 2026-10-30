<?php

namespace App\Http\Middleware;

use App\Enums\Espace;
use App\Enums\Permission;
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
        $user = $request->user();

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            // Données minimales (PLAN § 10) : chaque page reçoit le prénom, le
            // pseudo et si le numéro est vérifié — jamais le numéro lui-même.
            // `espace` : celui où le compte arrive (son habillage de « Mon
            // compte ») ; `espaces` : ceux qu'il peut ouvrir.
            'auth' => [
                'user' => $user ? [
                    ...$user->only(['id', 'prenom', 'pseudo']),
                    'numero_verifie' => $user->telephoneVerifie(),
                    'espace' => Espace::principalDe($user)?->value,
                    'espaces' => array_map(fn (Espace $espace) => $espace->value, Espace::accessiblesA($user)),
                    'double_authentification' => $user->can(Permission::DoubleAuthentification->value),
                ] : null,
            ],
            // Liste blanche des écrans gardés hors ligne (HORS_LIGNE.md A.3.7) :
            // la garde de navigation la lit pour ne jamais laisser un clic mort.
            'hors_ligne_pages' => array_values(config('hors_ligne.pages')),
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }
}
