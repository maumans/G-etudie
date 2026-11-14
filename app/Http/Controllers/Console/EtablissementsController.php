<?php

namespace App\Http\Controllers\Console;

use App\Enums\Role;
use App\Enums\TypeEtablissement;
use App\Http\Controllers\Controller;
use App\Models\Etablissement;
use App\Models\LicenceEtablissement;
use App\Models\RattachementEtablissement;
use App\Services\Organisation\EtablissementService;
use App\Services\Organisation\GesteRefuse;
use App\Services\Organisation\SuiviService;
use App\Support\RechercheTexte;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Console › Établissements (lot 11, décision 3) : créer un établissement
 * partenaire, nommer son gestionnaire, lui accorder des licences (contrat
 * signé hors de l'application).
 */
class EtablissementsController extends Controller
{
    public function __construct(
        private EtablissementService $etablissements,
        private SuiviService $suivi,
    ) {}

    public function index(Request $request): Response
    {
        $filtres = $request->validate(['recherche' => ['nullable', 'string', 'max:80']]);
        $requete = Etablissement::query()
            ->withCount(['groupes as groupes_count' => fn ($q) => $q->ouverts()])
            ->withCount(['rattachements as gestionnaires_count' => fn ($q) => $q->actifs()->where('role', Role::GestionnaireEtablissement->value)]);
        RechercheTexte::appliquer($requete, $filtres['recherche'] ?? null, ['nom', 'commune', 'prefecture']);

        $page = $requete->orderBy('nom')->orderBy('id')->paginate(25)->withQueryString();

        return Inertia::render('console/etablissements', [
            'filtres' => ['recherche' => $filtres['recherche'] ?? ''],
            'etablissements' => [
                'donnees' => collect($page->items())->map(fn (Etablissement $e) => [
                    'id' => $e->id,
                    'nom' => $e->nom,
                    'type' => $e->type->value,
                    'commune' => $e->commune,
                    'prefecture' => $e->prefecture,
                    'groupes' => (int) $e->groupes_count,
                    'gestionnaires' => (int) $e->gestionnaires_count,
                    'places' => $this->placesEnCours($e),
                    'est_exemple' => $e->est_exemple,
                ])->values(),
                'page' => $page->currentPage(),
                'derniere' => $page->lastPage(),
                'total' => $page->total(),
            ],
            'types' => array_map(fn (TypeEtablissement $t) => $t->value, TypeEtablissement::cases()),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $donnees = $request->validate([
            'nom' => ['required', 'string', 'max:160'],
            'type' => ['required', Rule::enum(TypeEtablissement::class)],
            'prefecture' => ['nullable', 'string', 'max:80'],
            'commune' => ['nullable', 'string', 'max:80'],
            'region' => ['nullable', 'string', 'max:80'],
        ]);

        $etablissement = $this->etablissements->creer(
            $request->user(),
            $donnees['nom'],
            TypeEtablissement::from($donnees['type']),
            $donnees['prefecture'] ?? null,
            $donnees['commune'] ?? null,
            $donnees['region'] ?? null,
        );

        return to_route('console.etablissements.show', $etablissement);
    }

    public function show(Request $request, Etablissement $etablissement): Response
    {
        return Inertia::render('console/etablissement', [
            'etablissement' => [
                'id' => $etablissement->id,
                'nom' => $etablissement->nom,
                'type' => $etablissement->type->value,
                'commune' => $etablissement->commune,
                'prefecture' => $etablissement->prefecture,
                'region' => $etablissement->region,
                'est_exemple' => $etablissement->est_exemple,
            ],
            'rattachements' => $etablissement->rattachements()->actifs()->with('user')->orderBy('role')->orderBy('id')->get()
                ->map(fn (RattachementEtablissement $r) => [
                    'id' => $r->id,
                    'role' => $r->role->value,
                    'libelle_role' => $r->role->libelle(),
                    'prenom' => $r->user->prenom,
                    'pseudo' => $r->user->pseudo,
                ])->values(),
            'licences' => $etablissement->licences()->orderByDesc('fin')->orderByDesc('id')->get()
                ->map(fn (LicenceEtablissement $l) => $this->suivi->resumeLicence($l))->values(),
            'mot_de_passe_provisoire' => $request->session()->get('mot_de_passe_provisoire'),
        ]);
    }

    public function gestionnaire(Request $request, Etablissement $etablissement): RedirectResponse
    {
        $donnees = $request->validate([
            'prenom' => ['required', 'string', 'max:60'],
            'telephone' => ['required', 'string', 'max:25'],
        ], [], ['telephone' => 'numéro']);

        try {
            $resultat = $this->etablissements->rattacher($request->user(), $etablissement, Role::GestionnaireEtablissement, $donnees['telephone'], $donnees['prenom']);
        } catch (GesteRefuse $refus) {
            throw ValidationException::withMessages([$refus->champ => $refus->getMessage()]);
        }

        if ($resultat['mot_de_passe'] !== null) {
            $request->session()->flash('mot_de_passe_provisoire', [
                'prenom' => $resultat['user']->prenom,
                'mot_de_passe' => $resultat['mot_de_passe'],
            ]);
        } else {
            Inertia::flash('toast', ['type' => 'success', 'message' => $resultat['user']->prenom.' gère maintenant cet établissement.']);
        }

        return to_route('console.etablissements.show', $etablissement);
    }

    public function licence(Request $request, Etablissement $etablissement): RedirectResponse
    {
        $donnees = $request->validate([
            'places' => ['required', 'integer', 'min:1', 'max:5000'],
            'debut' => ['required', 'date'],
            'fin' => ['required', 'date'],
            'reference' => ['nullable', 'string', 'max:120'],
        ], [], ['places' => 'places', 'debut' => 'début', 'fin' => 'fin', 'reference' => 'référence du contrat']);

        try {
            $this->etablissements->accorderLicence(
                $request->user(),
                $etablissement,
                (int) $donnees['places'],
                CarbonImmutable::parse($donnees['debut'])->startOfDay(),
                CarbonImmutable::parse($donnees['fin'])->endOfDay(),
                $donnees['reference'] ?? null,
            );
        } catch (GesteRefuse $refus) {
            throw ValidationException::withMessages([$refus->champ => $refus->getMessage()]);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Licence accordée.']);

        return to_route('console.etablissements.show', $etablissement);
    }

    /** @return array{places: int, prises: int}|null */
    private function placesEnCours(Etablissement $etablissement): ?array
    {
        $maintenant = CarbonImmutable::now();
        $licence = $etablissement->licences()->where('debut', '<=', $maintenant)->where('fin', '>', $maintenant)->orderByDesc('fin')->first();

        return $licence === null ? null : ['places' => $licence->places, 'prises' => $this->etablissements->placesPrises($licence)];
    }
}
