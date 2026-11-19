<?php

namespace App\Http\Controllers\Contenu;

use App\Enums\StatutRessource;
use App\Enums\TypeRessource;
use App\Http\Controllers\Controller;
use App\Models\Notion;
use App\Models\RessourceExterne;
use App\Services\Organisation\GesteRefuse;
use App\Services\RessourceService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Back-office › Ressources (lot 12, PLAN M19) : les liens sortants par
 * notion. Un rédacteur propose, un relecteur **différent** vérifie ; le
 * contrôle hebdomadaire signale les liens cassés.
 */
class RessourceController extends Controller
{
    private const FILTRES = ['a_verifier', 'verifiees', 'cassees', 'retirees'];

    public function __construct(private RessourceService $ressources) {}

    public function index(Request $request): Response
    {
        $filtre = in_array($request->string('etat')->toString(), self::FILTRES, true) ? $request->string('etat')->toString() : 'a_verifier';
        $acteur = $request->user();

        $requete = fn (string $etat): Builder => RessourceExterne::query()->where(fn (Builder $q) => match ($etat) {
            'a_verifier' => $q->where('statut', StatutRessource::Proposee->value),
            'verifiees' => $q->where('statut', StatutRessource::Verifiee->value)->whereNull('lien_casse_le'),
            'cassees' => $q->where('statut', StatutRessource::Verifiee->value)->whereNotNull('lien_casse_le'),
            default => $q->where('statut', StatutRessource::Retiree->value),
        });

        $liste = $requete($filtre)
            ->with(['notion.chapitre.matiere', 'auteur', 'verifieePar'])
            ->orderByDesc('updated_at')
            ->orderByDesc('id')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('contenu/ressources/index', [
            'ressources' => [
                'donnees' => collect($liste->items())->map(fn (RessourceExterne $r) => [
                    ...$r->pourEleve(),
                    'statut' => $r->statut->value,
                    'statut_libelle' => $r->statut->libelle(),
                    'notion' => ['id' => $r->notion_id, 'titre' => $r->notion->titre, 'chapitre' => $r->notion->chapitre->titre],
                    'matiere' => ['nom' => $r->notion->chapitre->matiere->nom, 'teinte' => $r->notion->chapitre->matiere->teinte->value],
                    'auteur' => $r->auteur?->pseudo,
                    'verifiee_par' => $r->verifieePar?->pseudo,
                    'verifiee_le' => $r->verifiee_le?->toIso8601String(),
                    'lien_casse_le' => $r->lien_casse_le?->toIso8601String(),
                    'motif_retrait' => $r->motif_retrait,
                    'poids_saisi_ko' => $r->poids_ko,
                    'peut_verifier' => $this->ressources->peutVerifier($acteur, $r),
                    'peut_modifier' => $this->ressources->peutModifier($acteur, $r),
                ])->values(),
                'page' => $liste->currentPage(),
                'derniere' => $liste->lastPage(),
                'total' => $liste->total(),
            ],
            'filtre' => $filtre,
            'compteurs' => collect(self::FILTRES)->mapWithKeys(fn (string $etat) => [$etat => $requete($etat)->count()]),
            'notions' => Notion::query()
                ->with('chapitre.matiere')
                ->join('chapitres', 'chapitres.id', '=', 'notions.chapitre_id')
                ->join('matieres', 'matieres.id', '=', 'chapitres.matiere_id')
                ->orderBy('matieres.ordre')
                ->orderBy('chapitres.ordre')
                ->orderBy('notions.ordre')
                ->orderBy('notions.id')
                ->select('notions.*')
                ->get()
                ->map(fn (Notion $n) => [
                    'id' => $n->id,
                    'titre' => $n->titre,
                    'chapitre' => $n->chapitre->titre,
                    'matiere' => $n->chapitre->matiere->nom,
                ])->values(),
            'types' => collect(TypeRessource::cases())->map(fn (TypeRessource $t) => ['valeur' => $t->value, 'libelle' => $t->libelle()]),
            'sites' => array_values(array_unique(array_values(config('ressources.domaines')))),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $donnees = $this->valider($request);
        $notion = Notion::query()->findOrFail((int) $request->integer('notion'));

        $this->tenter(fn () => $this->ressources->proposer($request->user(), $notion, $donnees));
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Ressource proposée : un relecteur va la vérifier.']);

        return to_route('contenu.ressources.index');
    }

    public function update(Request $request, RessourceExterne $ressource): RedirectResponse
    {
        $donnees = $this->valider($request, false);
        $this->tenter(fn () => $this->ressources->modifier($request->user(), $ressource, $donnees));
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Ressource modifiée : elle repasse en vérification.']);

        return back();
    }

    public function verifier(Request $request, RessourceExterne $ressource): RedirectResponse
    {
        $this->tenter(fn () => $this->ressources->verifier($request->user(), $ressource));
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Ressource vérifiée : les élèves la voient sous les leçons de la notion.']);

        return back();
    }

    public function retirer(Request $request, RessourceExterne $ressource): RedirectResponse
    {
        $donnees = $request->validate(['motif' => ['required', 'string', 'max:300']], [], ['motif' => 'motif']);
        $this->tenter(fn () => $this->ressources->retirer($request->user(), $ressource, $donnees['motif']));
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Ressource retirée.']);

        return back();
    }

    /**
     * @return array{url: string, titre: string, type: TypeRessource, description: string|null, poids_ko: int|null, duree_minutes: int|null}
     */
    private function valider(Request $request, bool $avecNotion = true): array
    {
        $donnees = $request->validate([
            ...($avecNotion ? ['notion' => ['required', 'integer', Rule::exists('notions', 'id')]] : []),
            'url' => ['required', 'string', 'max:500'],
            'titre' => ['required', 'string', 'max:160'],
            'type' => ['required', Rule::enum(TypeRessource::class)],
            'description' => ['nullable', 'string', 'max:300'],
            'poids_ko' => ['nullable', 'integer', 'min:1', 'max:2000000'],
            'duree_minutes' => ['nullable', 'integer', 'min:1', 'max:600'],
        ], [], ['url' => 'lien', 'poids_ko' => 'poids', 'duree_minutes' => 'durée']);

        return [
            'url' => $donnees['url'],
            'titre' => $donnees['titre'],
            'type' => TypeRessource::from($donnees['type']),
            'description' => $donnees['description'] ?? null,
            'poids_ko' => isset($donnees['poids_ko']) ? (int) $donnees['poids_ko'] : null,
            'duree_minutes' => isset($donnees['duree_minutes']) ? (int) $donnees['duree_minutes'] : null,
        ];
    }

    private function tenter(callable $geste): void
    {
        try {
            $geste();
        } catch (GesteRefuse $refus) {
            throw ValidationException::withMessages([$refus->champ => $refus->getMessage()]);
        }
    }
}
