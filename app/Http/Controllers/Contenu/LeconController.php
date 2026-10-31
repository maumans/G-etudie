<?php

namespace App\Http\Controllers\Contenu;

use App\Enums\Permission;
use App\Enums\StatutContenu;
use App\Http\Controllers\Controller;
use App\Models\Chapitre;
use App\Models\Lecon;
use App\Models\Matiere;
use App\Models\Notion;
use App\Models\Question;
use App\Models\User;
use App\Models\VersionContenu;
use App\Services\ContenuService;
use App\Support\BlocsContenu;
use App\Support\Perimetre;
use App\Support\RechercheTexte;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Back-office › Leçons : la liste (et la file de relecture), la création,
 * l'éditeur, la fiche (relecture, historique). Toute transition passe par
 * ContenuService ; la policy dit qui voit quel bouton.
 */
class LeconController extends Controller
{
    private const VUES = ['toutes', 'miennes', 'a_relire'];

    public function __construct(private ContenuService $contenu) {}

    public function index(Request $request): Response
    {
        return $this->liste($request, $request->string('vue')->toString());
    }

    /** File de relecture : les leçons des autres qui attendent une décision. */
    public function relecture(Request $request): Response
    {
        return $this->liste($request, 'a_relire');
    }

    public function create(Request $request): Response
    {
        $chapitres = Chapitre::query()
            ->with(['matiere', 'classe', 'notions'])
            ->whereHas('notions')
            ->get()
            ->sortBy(fn (Chapitre $c) => [$c->matiere->ordre, $c->classe->ordre, $c->ordre]);

        return Inertia::render('contenu/lecons/creer', [
            'groupes' => $chapitres->values()->map(fn (Chapitre $c) => [
                'libelle' => "{$c->matiere->nom} · {$c->classe->nom} · {$c->titre}",
                'teinte' => $c->matiere->teinte->value,
                'notions' => $c->notions->map(fn (Notion $n) => ['id' => $n->id, 'titre' => $n->titre]),
            ]),
            'notion_id' => $request->integer('notion') ?: null,
            'peut_saisir_programme' => $request->user()->can(Permission::GererReferentiel->value),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $donnees = $request->validate([
            'notion_id' => ['required', 'integer', Rule::exists('notions', 'id')],
            'titre' => ['required', 'string', 'max:160'],
        ]);

        $lecon = $this->contenu->creerLecon($request->user(), Notion::findOrFail($request->integer('notion_id')), $donnees['titre']);

        return to_route('contenu.lecons.edit', $lecon);
    }

    public function show(Request $request, Lecon $lecon): Response
    {
        Gate::authorize('view', $lecon);

        $lecon->load(['notion.chapitre.matiere', 'notion.chapitre.classe', 'auteur', 'versions.auteur', 'versions.decidePar']);
        $user = $request->user();
        $enRelecture = $lecon->versionEnRelecture();

        // Version affichée : celle demandée, sinon celle qui attend le
        // relecteur, sinon la publiée ; le brouillon en dernier recours.
        $choisie = $lecon->versions->firstWhere('numero', $request->integer('version'))
            ?? $enRelecture
            ?? $lecon->versions->firstWhere('id', $lecon->version_publiee_id);

        return Inertia::render('contenu/lecons/fiche', [
            'lecon' => $this->presenter($lecon, $user),
            'affichee' => $choisie !== null ? [
                'source' => 'version',
                'numero' => $choisie->numero,
                'titre' => $choisie->titre,
                'blocs' => $choisie->blocs,
                'resume' => BlocsContenu::resume($choisie->blocs),
            ] : [
                'source' => 'brouillon',
                'numero' => null,
                'titre' => $lecon->titre,
                'blocs' => $lecon->brouillon,
                'resume' => BlocsContenu::resume($lecon->brouillon),
            ],
            'versions' => $lecon->versions->map(fn (VersionContenu $v) => [
                'numero' => $v->numero,
                'titre' => $v->titre,
                'auteur' => $v->auteur->pseudo,
                'soumise_le' => $v->soumise_le->toIso8601String(),
                'decision' => $v->decision?->value,
                'decide_par' => $v->decidePar?->pseudo,
                'decide_le' => $v->decide_le?->toIso8601String(),
                'commentaire' => $v->commentaire,
                'publiee' => $v->id === $lecon->version_publiee_id,
            ]),
            'droits' => [
                'rediger' => Gate::allows('rediger', $lecon),
                'relire' => Gate::allows('relire', $lecon),
                'archiver' => Gate::allows('archiver', $lecon),
                // Le bouton « Relire » tu, il faut dire pourquoi.
                'auteur' => Perimetre::estAuteurDe($user, $lecon),
            ],
        ]);
    }

    public function edit(Request $request, Lecon $lecon): Response|RedirectResponse
    {
        Gate::authorize('rediger', $lecon);

        if ($lecon->statut !== StatutContenu::Brouillon) {
            return to_route('contenu.lecons.show', $lecon);
        }

        $lecon->load(['notion.chapitre.matiere', 'notion.chapitre.classe', 'auteur']);

        return Inertia::render('contenu/lecons/edition', [
            'lecon' => [
                ...$this->presenter($lecon, $request->user()),
                'blocs' => $lecon->brouillon,
                'revision' => $lecon->revision,
            ],
            'renvoi' => ($renvoi = $lecon->dernierRenvoi()) ? [
                'commentaire' => $renvoi->commentaire,
                'par' => $renvoi->decidePar?->pseudo,
                'le' => $renvoi->decide_le?->toIso8601String(),
            ] : null,
            // Mini-questions possibles : les questions publiées du chapitre.
            'questions_disponibles' => Question::query()
                ->whereNotNull('version_publiee_id')
                ->where('statut', '!=', StatutContenu::Archive->value)
                ->whereHas('notion', fn (Builder $q) => $q->where('chapitre_id', $lecon->notion->chapitre_id))
                ->with('notion')
                ->orderBy('notion_id')
                ->limit(60)
                ->get()
                ->map(fn (Question $q) => [
                    'uuid' => $q->uuid,
                    'extrait' => $q->extrait,
                    'type' => $q->type->libelle(),
                    'notion' => $q->notion->titre,
                ]),
        ]);
    }

    public function update(Request $request, Lecon $lecon): RedirectResponse
    {
        Gate::authorize('rediger', $lecon);

        $donnees = $request->validate([
            'titre' => ['required', 'string', 'max:160'],
            'blocs' => ['required', 'array'],
            'revision' => ['required', 'integer', 'min:0'],
        ]);

        $this->contenu->enregistrerBrouillon($lecon, $request->user(), $donnees['titre'], $donnees['blocs'], $donnees['revision']);

        return to_route('contenu.lecons.edit', $lecon);
    }

    public function soumettre(Request $request, Lecon $lecon): RedirectResponse
    {
        Gate::authorize('rediger', $lecon);
        $this->contenu->soumettre($lecon, $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Leçon envoyée en relecture.']);

        return to_route('contenu.lecons.show', $lecon);
    }

    public function reprendre(Request $request, Lecon $lecon): RedirectResponse
    {
        Gate::authorize('rediger', $lecon);
        $this->contenu->reprendre($lecon, $request->user());

        return to_route('contenu.lecons.edit', $lecon);
    }

    public function modifier(Request $request, Lecon $lecon): RedirectResponse
    {
        Gate::authorize('rediger', $lecon);
        $this->contenu->ouvrirModification($lecon, $request->user());

        return to_route('contenu.lecons.edit', $lecon);
    }

    public function publier(Request $request, Lecon $lecon): RedirectResponse
    {
        Gate::authorize('relire', $lecon);
        $donnees = $request->validate(['commentaire' => ['nullable', 'string', 'max:2000']]);

        $this->contenu->publier($lecon, $request->user(), $donnees['commentaire'] ?? null);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Leçon publiée : les élèves la voient.']);

        return to_route('contenu.lecons.show', $lecon);
    }

    public function renvoyer(Request $request, Lecon $lecon): RedirectResponse
    {
        Gate::authorize('relire', $lecon);
        $donnees = $request->validate(['commentaire' => ['required', 'string', 'max:2000']]);

        $this->contenu->renvoyer($lecon, $request->user(), $donnees['commentaire']);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Leçon renvoyée à son auteur.']);

        return to_route('contenu.lecons.relecture');
    }

    public function archiver(Request $request, Lecon $lecon): RedirectResponse
    {
        Gate::authorize('archiver', $lecon);
        $this->contenu->archiver($lecon, $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Leçon archivée.']);

        return to_route('contenu.lecons.show', $lecon);
    }

    public function restaurer(Request $request, Lecon $lecon): RedirectResponse
    {
        Gate::authorize('archiver', $lecon);
        $this->contenu->restaurer($lecon, $request->user());

        return to_route('contenu.lecons.show', $lecon);
    }

    private function liste(Request $request, string $vue): Response
    {
        $user = $request->user();
        $vue = in_array($vue, self::VUES, true) ? $vue : 'toutes';

        if ($vue === 'a_relire' && ! $user->can(Permission::RelireContenu->value)) {
            $vue = 'toutes';
        }

        $filtres = [
            'vue' => $vue,
            'statut' => StatutContenu::tryFrom($request->string('statut')->toString())?->value,
            'matiere' => $request->integer('matiere') ?: null,
            'recherche' => $request->string('recherche')->trim()->toString(),
        ];

        $base = Lecon::query()->when($vue === 'miennes', fn (Builder $q) => $q->where('auteur_id', $user->id));

        if ($vue === 'a_relire') {
            $base->where('statut', StatutContenu::EnRelecture)
                ->where('auteur_id', '!=', $user->id)
                ->whereDoesntHave('versions', fn (Builder $q) => $q->whereNull('decision')->where('auteur_id', $user->id));
        }

        $compteurs = (clone $base)->toBase()
            ->selectRaw('statut, count(*) as nombre')
            ->groupBy('statut')
            ->pluck('nombre', 'statut');

        $requete = (clone $base)
            ->with(['notion.chapitre.matiere', 'notion.chapitre.classe', 'auteur'])
            ->when($filtres['statut'], fn (Builder $q, string $statut) => $q->where('statut', $statut))
            ->when($filtres['matiere'], fn (Builder $q, int $matiere) => $q->whereHas('notion.chapitre', fn (Builder $c) => $c->where('matiere_id', $matiere)));

        RechercheTexte::appliquer($requete, $filtres['recherche'], ['titre', 'notion.titre', 'notion.chapitre.titre']);

        $lecons = $requete->orderByDesc('updated_at')->orderByDesc('id')->paginate(20)->withQueryString();

        return Inertia::render('contenu/lecons/index', [
            'lecons' => [
                'donnees' => collect($lecons->items())->map(fn (Lecon $l) => $this->presenter($l, $user)),
                'page' => $lecons->currentPage(),
                'derniere' => $lecons->lastPage(),
                'total' => $lecons->total(),
            ],
            'filtres' => $filtres,
            'compteurs' => collect(StatutContenu::cases())->mapWithKeys(fn (StatutContenu $s) => [$s->value => (int) ($compteurs[$s->value] ?? 0)]),
            'a_relire' => $user->can(Permission::RelireContenu->value) ? self::nombreARelire($user) : null,
            'questions_a_relire' => $user->can(Permission::RelireContenu->value) ? QuestionController::nombreARelire($user) : null,
            'annales_a_relire' => $user->can(Permission::RelireContenu->value) ? AnnaleController::nombreARelire($user) : null,
            'matieres' => Matiere::query()->orderBy('ordre')->get(['id', 'nom', 'teinte']),
        ]);
    }

    public static function nombreARelire(User $user): int
    {
        return Lecon::query()
            ->where('statut', StatutContenu::EnRelecture)
            ->where('auteur_id', '!=', $user->id)
            ->whereDoesntHave('versions', fn (Builder $q) => $q->whereNull('decision')->where('auteur_id', $user->id))
            ->count();
    }

    /**
     * @return array<string, mixed>
     */
    private function presenter(Lecon $lecon, User $user): array
    {
        $chapitre = $lecon->notion->chapitre;

        return [
            'uuid' => $lecon->uuid,
            'titre' => $lecon->titre,
            'statut' => $lecon->statut->value,
            'publiee' => $lecon->version_publiee_id !== null,
            'est_exemple' => $lecon->est_exemple,
            'auteur' => $lecon->auteur->pseudo,
            'de_moi' => $lecon->auteur_id === $user->id,
            'modifiee_le' => $lecon->updated_at->toIso8601String(),
            'matiere' => ['nom' => $chapitre->matiere->nom, 'teinte' => $chapitre->matiere->teinte->value],
            'classe' => $chapitre->classe->nom,
            'chapitre' => $chapitre->titre,
            'notion' => $lecon->notion->titre,
        ];
    }
}
