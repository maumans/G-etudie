<?php

namespace App\Http\Controllers\Console;

use App\Enums\EtiquetteAvis;
use App\Enums\ReponseAvis;
use App\Http\Controllers\Controller;
use App\Models\AvisEleve;
use App\Models\CampagneTerrain;
use App\Models\DiagnosticAppareil;
use App\Models\ErreurAppareil;
use App\Models\Etablissement;
use App\Models\User;
use App\Services\TerrainService;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Console › Terrain (lot 14, PLAN § 12) : ce que disent les élèves (« Ton
 * avis ») et ce que voient les appareils (diagnostics, erreurs), sur une
 * campagne d'essai ou les 30 derniers jours. Un avis se « traite » avec la
 * décision prise : c'est la trace de la prise en compte des critiques.
 * Permission `console.terrain`. En ligne seulement (niveau C).
 */
class TerrainController extends Controller
{
    public const VUES = ['avis', 'erreurs', 'diagnostics'];

    public function __construct(private TerrainService $terrain) {}

    public function index(Request $request): Response
    {
        $donnees = $request->validate([
            'vue' => ['nullable', Rule::in(self::VUES)],
            'campagne' => ['nullable', 'integer'],
            'reponse' => ['nullable', Rule::enum(ReponseAvis::class)],
            'statut' => ['nullable', Rule::in(['a_traiter', 'traites'])],
            'code' => ['nullable', 'string', 'max:12'],
        ]);
        $filtres = [
            'vue' => $donnees['vue'] ?? 'avis',
            'campagne' => isset($donnees['campagne']) ? (int) $donnees['campagne'] : null,
            'reponse' => $donnees['reponse'] ?? null,
            'statut' => $donnees['statut'] ?? null,
            'code' => strtoupper(trim($donnees['code'] ?? '')),
        ];

        $campagne = $filtres['campagne'] === null ? null : CampagneTerrain::query()->with('etablissement:id,nom')->find($filtres['campagne']);
        $du = $campagne?->debut->toImmutable()->startOfDay() ?? CarbonImmutable::now()->subDays(29)->startOfDay();
        $au = $campagne?->fin->toImmutable()->endOfDay() ?? CarbonImmutable::now()->endOfDay();
        $etablissement = $campagne?->etablissement_id;

        $avis = $this->avis($du, $au, $etablissement);
        $erreurs = ErreurAppareil::query()->whereBetween('derniere_le', [$du, $au]);
        $diagnostics = $this->diagnostics($du, $au, $etablissement);

        $total = (clone $avis)->count();
        $repartition = (clone $avis)->toBase()->selectRaw('reponse, count(*) as n')->groupBy('reponse')->pluck('n', 'reponse');
        $etiquettes = collect(EtiquetteAvis::cases())->map(fn (EtiquetteAvis $e) => [
            'cle' => $e->value,
            'libelle' => $e->libelle(),
            'nombre' => (clone $avis)->whereJsonContains('etiquettes', $e->value)->count(),
        ])->sortByDesc('nombre')->values();

        return Inertia::render('console/terrain', [
            'filtres' => $filtres,
            'campagnes' => CampagneTerrain::query()->with('etablissement:id,nom')
                ->orderByDesc('debut')->orderByDesc('id')->get()
                ->map(fn (CampagneTerrain $c) => self::campagne($c))->values(),
            'campagne' => $campagne === null ? null : self::campagne($campagne),
            'periode' => ['du' => $du->toDateString(), 'au' => $au->toDateString()],
            'etablissements' => Etablissement::query()->orderBy('nom')->orderBy('id')->get(['id', 'nom'])
                ->map(fn (Etablissement $e) => ['id' => $e->id, 'nom' => $e->nom])->values(),
            'bilan' => [
                'avis' => $total,
                'oui' => (int) ($repartition[ReponseAvis::Oui->value] ?? 0),
                'un_peu' => (int) ($repartition[ReponseAvis::UnPeu->value] ?? 0),
                'non' => (int) ($repartition[ReponseAvis::Non->value] ?? 0),
                'a_traiter' => (clone $avis)->whereNull('traite_le')->count(),
                'erreurs' => (clone $erreurs)->count(),
                'occurrences' => (int) (clone $erreurs)->sum('occurrences'),
                'diagnostics' => (clone $diagnostics)->count(),
            ],
            'etiquettes' => $etiquettes,
            'exemple' => (clone $avis)->where('avis_eleves.est_exemple', true)->exists()
                || (clone $erreurs)->where('est_exemple', true)->exists()
                || (clone $diagnostics)->where('est_exemple', true)->exists(),
            'liste' => match ($filtres['vue']) {
                'erreurs' => $this->listeErreurs($erreurs),
                'diagnostics' => $this->listeDiagnostics($diagnostics, $filtres['code']),
                default => $this->listeAvis($avis, $filtres),
            },
        ]);
    }

    public function creerCampagne(Request $request): RedirectResponse
    {
        $donnees = $request->validate([
            'nom' => ['required', 'string', 'max:120'],
            'lieu' => ['required', 'string', 'max:120'],
            'etablissement_id' => ['nullable', 'integer', Rule::exists('etablissements', 'id')],
            'debut' => ['required', 'date_format:Y-m-d'],
            'fin' => ['required', 'date_format:Y-m-d', 'after_or_equal:debut'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ], [], [
            'nom' => 'le nom',
            'lieu' => 'le lieu',
            'debut' => 'le premier jour',
            'fin' => 'le dernier jour',
        ]);

        /** @var User $moi */
        $moi = $request->user();
        $campagne = CampagneTerrain::query()->create([...$donnees, 'creee_par' => $moi->id]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Campagne « '.$campagne->nom.' » créée.']);

        return to_route('console.terrain.index', ['campagne' => $campagne->id]);
    }

    public function traiterAvis(Request $request, AvisEleve $avis): RedirectResponse
    {
        $donnees = $request->validate([
            'decision' => ['required', 'string', 'min:3', 'max:500'],
        ], [], ['decision' => 'la décision']);

        /** @var User $moi */
        $moi = $request->user();
        $this->terrain->traiterAvis($avis, $moi, $donnees['decision']);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Avis traité : la décision est notée.']);

        return back();
    }

    /** @return Builder<AvisEleve> */
    private function avis(CarbonImmutable $du, CarbonImmutable $au, ?int $etablissement): Builder
    {
        return AvisEleve::query()
            ->whereBetween('donne_le', [$du, $au])
            ->when($etablissement, fn (Builder $q, int $id) => $q->whereHas(
                'eleve.profilEleve',
                fn (Builder $p) => $p->where('etablissement_id', $id),
            ));
    }

    /** @return Builder<DiagnosticAppareil> */
    private function diagnostics(CarbonImmutable $du, CarbonImmutable $au, ?int $etablissement): Builder
    {
        return DiagnosticAppareil::query()
            ->whereBetween('releve_le', [$du, $au])
            ->when($etablissement, fn (Builder $q, int $id) => $q->whereHas(
                'compte.profilEleve',
                fn (Builder $p) => $p->where('etablissement_id', $id),
            ));
    }

    /**
     * @param  Builder<AvisEleve>  $requete
     * @param  array{reponse: string|null, statut: string|null}  $filtres
     * @return array<string, mixed>
     */
    private function listeAvis(Builder $requete, array $filtres): array
    {
        $page = $requete
            ->with(['eleve:id,pseudo', 'eleve.profilEleve:id,user_id,examen_id,etablissement_id', 'eleve.profilEleve.examen:id,code', 'eleve.profilEleve.etablissement:id,nom', 'traitant:id,prenom'])
            ->when($filtres['reponse'], fn (Builder $q, string $r) => $q->where('reponse', $r))
            ->when($filtres['statut'] === 'a_traiter', fn (Builder $q) => $q->whereNull('traite_le'))
            ->when($filtres['statut'] === 'traites', fn (Builder $q) => $q->whereNotNull('traite_le'))
            ->orderByDesc('donne_le')->orderByDesc('id')
            ->paginate(20)->withQueryString();

        return [
            'donnees' => collect($page->items())->map(fn (AvisEleve $a) => [
                'id' => $a->id,
                'reponse' => $a->reponse->value,
                'libelle' => $a->reponse->libelle(),
                'etiquettes' => array_map(
                    fn (string $cle) => EtiquetteAvis::tryFrom($cle)?->libelle() ?? $cle,
                    $a->etiquettes,
                ),
                'commentaire' => $a->commentaire,
                'ecran' => $a->ecran,
                'eleve' => $a->eleve->pseudo,
                'examen' => $a->eleve->profilEleve?->examen?->code->value,
                'etablissement' => $a->eleve->profilEleve?->etablissement?->nom,
                'version_app' => $a->version_app,
                'le' => $a->donne_le->toIso8601ZuluString(),
                'traite' => $a->traite_le === null ? null : [
                    'decision' => $a->decision,
                    'par' => $a->traitant?->prenom,
                    'le' => $a->traite_le->toIso8601ZuluString(),
                ],
                'est_exemple' => $a->est_exemple,
            ])->values(),
            'page' => $page->currentPage(),
            'derniere' => $page->lastPage(),
            'total' => $page->total(),
        ];
    }

    /**
     * @param  Builder<ErreurAppareil>  $requete
     * @return array<string, mixed>
     */
    private function listeErreurs(Builder $requete): array
    {
        $page = $requete->orderByDesc('derniere_le')->orderByDesc('id')->paginate(20)->withQueryString();

        return [
            'donnees' => collect($page->items())->map(fn (ErreurAppareil $e) => [
                'id' => $e->id,
                'type' => $e->type->value,
                'libelle' => $e->type->libelle(),
                'message' => $e->message,
                'source' => $e->source,
                'pile' => $e->pile,
                'version_app' => $e->version_app,
                'navigateur' => $e->navigateur,
                'occurrences' => $e->occurrences,
                'premiere_le' => $e->premiere_le->toIso8601ZuluString(),
                'derniere_le' => $e->derniere_le->toIso8601ZuluString(),
            ])->values(),
            'page' => $page->currentPage(),
            'derniere' => $page->lastPage(),
            'total' => $page->total(),
        ];
    }

    /**
     * @param  Builder<DiagnosticAppareil>  $requete
     * @return array<string, mixed>
     */
    private function listeDiagnostics(Builder $requete, string $code): array
    {
        // Un code se cherche sur toute la garde (90 jours), pas seulement
        // sur la période : l'équipe le recopie souvent après coup.
        $page = ($code !== '' ? DiagnosticAppareil::query()->where('code', $code) : $requete)
            ->with('appareil:id,libelle')
            ->orderByDesc('releve_le')->orderByDesc('id')
            ->paginate(20)->withQueryString();

        return [
            'donnees' => collect($page->items())->map(fn (DiagnosticAppareil $d) => [
                'id' => $d->id,
                'code' => $d->code,
                'appareil' => $d->appareil?->libelle,
                'version_app' => $d->version_app,
                'donnees' => TerrainService::nettoyerDiagnostic($d->donnees),
                'le' => $d->releve_le->toIso8601ZuluString(),
            ])->values(),
            'page' => $page->currentPage(),
            'derniere' => $page->lastPage(),
            'total' => $page->total(),
        ];
    }

    /** @return array<string, mixed> */
    private static function campagne(CampagneTerrain $c): array
    {
        return [
            'id' => $c->id,
            'nom' => $c->nom,
            'lieu' => $c->lieu,
            'etablissement' => $c->etablissement?->nom,
            'debut' => $c->debut->toDateString(),
            'fin' => $c->fin->toDateString(),
            'notes' => $c->notes,
            'est_exemple' => $c->est_exemple,
        ];
    }
}
