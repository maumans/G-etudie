<?php

namespace App\Http\Controllers\Console;

use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Plateforme\ComptesService;
use App\Support\RechercheTexte;
use App\Support\Telephone;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Console › Personnel (lot 13) : les comptes du back-office, de la console,
 * des enseignants et des gestionnaires d'établissement ; les désactiver ou
 * les réactiver (ComptesService). Un compte qui n'est pas du personnel
 * répond 404 (CLAUDE.md § 3 : 404, pas 403). Permission
 * `comptes.administrer`.
 */
class PersonnelController extends Controller
{
    public function __construct(private ComptesService $comptes) {}

    public function index(Request $request): Response
    {
        $roles = self::rolesPersonnel();
        $donnees = $request->validate([
            'role' => ['nullable', Rule::in($roles)],
            'statut' => ['nullable', Rule::in(['actifs', 'desactives'])],
            'recherche' => ['nullable', 'string', 'max:80'],
        ]);
        $filtres = [
            'role' => $donnees['role'] ?? null,
            'statut' => $donnees['statut'] ?? null,
            'recherche' => trim($donnees['recherche'] ?? ''),
        ];

        $requete = User::query()->role($filtres['role'] ?? $roles)->with('roles')
            ->addSelect(['derniere_activite' => DB::table('sessions')->selectRaw('max(last_activity)')->whereColumn('sessions.user_id', 'users.id')])
            ->when($filtres['statut'] === 'actifs', fn (Builder $q) => $q->whereNull('desactive_le'))
            ->when($filtres['statut'] === 'desactives', fn (Builder $q) => $q->whereNotNull('desactive_le'));
        RechercheTexte::appliquer($requete, $filtres['recherche'], ['prenom', 'nom', 'pseudo']);

        $page = $requete->orderByRaw('desactive_le is not null')->orderBy('prenom')->orderBy('id')->paginate(25)->withQueryString();
        $moi = $request->user();

        return Inertia::render('console/personnel', [
            'filtres' => $filtres,
            'roles' => array_map(fn (string $r) => ['cle' => $r, 'libelle' => Role::from($r)->libelle()], $roles),
            'bilan' => [
                'actifs' => User::query()->role($roles)->whereNull('desactive_le')->count(),
                'desactives' => User::query()->role($roles)->whereNotNull('desactive_le')->count(),
                'sans_double_authentification' => User::query()->role($roles)->whereNull('desactive_le')->whereNull('two_factor_confirmed_at')->count(),
            ],
            'comptes' => [
                'donnees' => collect($page->items())->map(fn (User $u) => [
                    'id' => $u->id,
                    'nom' => trim($u->prenom.' '.($u->nom ?? '')),
                    'pseudo' => $u->pseudo,
                    'telephone' => Telephone::masquer($u->telephone),
                    'roles' => $u->getRoleNames()->map(fn (string $nom) => Role::tryFrom($nom)?->libelle() ?? $nom)->values(),
                    'double_authentification' => $u->two_factor_confirmed_at !== null,
                    'derniere_activite' => $u->getAttribute('derniere_activite') === null ? null : CarbonImmutable::createFromTimestamp((int) $u->getAttribute('derniere_activite'))->toIso8601ZuluString(),
                    'desactive_le' => $u->desactive_le?->toIso8601ZuluString(),
                    'est_moi' => $u->is($moi),
                ])->values(),
                'page' => $page->currentPage(),
                'derniere' => $page->lastPage(),
                'total' => $page->total(),
            ],
        ]);
    }

    public function desactiver(Request $request, User $user): RedirectResponse
    {
        abort_unless(ComptesService::estPersonnel($user), 404);
        $this->comptes->desactiver($user, $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => "Compte de {$user->prenom} désactivé : ses sessions sont fermées."]);

        return back();
    }

    public function reactiver(Request $request, User $user): RedirectResponse
    {
        abort_unless(ComptesService::estPersonnel($user), 404);
        $this->comptes->reactiver($user, $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => "Compte de {$user->prenom} réactivé."]);

        return back();
    }

    /**
     * @return list<string>
     */
    public static function rolesPersonnel(): array
    {
        return array_values(array_map(
            fn (Role $r) => $r->value,
            array_filter(Role::cases(), fn (Role $r) => $r->estPersonnel()),
        ));
    }
}
