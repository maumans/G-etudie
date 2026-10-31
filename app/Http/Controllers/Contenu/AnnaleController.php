<?php

namespace App\Http\Controllers\Contenu;

use App\Enums\Permission;
use App\Enums\StatutContenu;
use App\Enums\StatutImport;
use App\Enums\TypeQuestion;
use App\Enums\TypeSujet;
use App\Http\Controllers\Controller;
use App\Models\Chapitre;
use App\Models\Classe;
use App\Models\Examen;
use App\Models\ImportSujet;
use App\Models\Matiere;
use App\Models\Notion;
use App\Models\Question;
use App\Models\Sujet;
use App\Models\SujetPartie;
use App\Models\User;
use App\Models\VersionContenu;
use App\Services\Annales\SujetService;
use App\Services\ContenuService;
use App\Support\Perimetre;
use App\Support\PresentationQuestion;
use App\Support\RechercheTexte;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Back-office › Annales (PLAN M6, M17) : la liste des sujets et les imports
 * en cours, la file de relecture, la fiche d'une annale (document original à
 * côté de la version structurée, parties, questions à vérifier, versions)
 * et son circuit. Les transitions passent par SujetService ; la policy dit
 * qui voit quel bouton.
 */
class AnnaleController extends Controller
{
    private const VUES = ['toutes', 'miennes', 'a_relire'];

    public function __construct(
        private SujetService $sujets,
        private ContenuService $contenu,
    ) {}

    public function index(Request $request): Response
    {
        return $this->liste($request, $request->string('vue')->toString());
    }

    public function relecture(Request $request): Response
    {
        return $this->liste($request, 'a_relire');
    }

    public function show(Request $request, Sujet $sujet): Response
    {
        Gate::authorize('view', $sujet);

        $user = $request->user();
        $sujet->load(['examen', 'serie', 'matiere', 'auteur', 'versions.auteur', 'versions.decidePar', 'parties.questions.notion.chapitre.matiere']);
        $import = ImportSujet::query()->where('sujet_id', $sujet->id)->latest('id')->first();
        $brouillon = $sujet->statut === StatutContenu::Brouillon;
        $classe = Classe::query()->where('examen_id', $sujet->examen_id)->first();

        return Inertia::render('contenu/annales/fiche', [
            'sujet' => [
                ...$this->presenter($sujet, $user),
                'duree_minutes' => $sujet->duree_minutes,
                'coefficient' => $sujet->coefficient,
                'droits_publication' => $sujet->droits,
                'revision' => $sujet->revision,
                'document' => $sujet->document_chemin === null ? null : [
                    'nom' => $sujet->document_nom,
                    'type' => $sujet->document_type,
                    'octets' => $sujet->document_octets,
                    'url' => route('contenu.annales.document', $sujet),
                ],
            ],
            'parties' => $sujet->parties->map(fn (SujetPartie $partie) => [
                'uuid' => $partie->uuid,
                'titre' => $partie->titre,
                'bareme' => $partie->bareme === null ? null : (float) $partie->bareme,
                'consigne' => $partie->consigne,
                'questions' => $partie->questions->map(fn (Question $q) => [
                    'uuid' => $q->uuid,
                    'type' => $q->type->value,
                    'type_libelle' => $q->type->libelle(),
                    'titre' => $q->extrait !== '' ? $q->extrait : 'Question sans texte',
                    'statut' => $q->statut->value,
                    'publiee' => $q->version_publiee_id !== null,
                    'a_verifier' => $q->reponse_a_verifier,
                    'a_completer' => $q->statut === StatutContenu::Brouillon ? $q->erreurAvantRelecture() : null,
                    'notion' => $q->notion->titre,
                    'chapitre' => $q->notion->chapitre->titre,
                    'difficulte' => $q->difficulte,
                    'etapes' => count($q->corrige ?? []),
                    'apercu' => PresentationQuestion::brouillon($q),
                ])->values(),
            ])->values(),
            'a_completer' => $brouillon ? $sujet->erreurAvantRelecture() : null,
            'import' => $import === null ? null : [
                'avertissements' => $import->avertissements ?? [],
                'modele' => $import->modele,
                'jetons' => ($import->jetons_entree ?? 0) + ($import->jetons_sortie ?? 0),
                'termine_le' => $import->termine_le?->toIso8601String(),
            ],
            'versions' => $sujet->versions->map(fn (VersionContenu $v) => [
                'numero' => $v->numero,
                'titre' => $v->titre,
                'auteur' => $v->auteur->pseudo,
                'soumise_le' => $v->soumise_le->toIso8601String(),
                'decision' => $v->decision?->value,
                'decide_par' => $v->decidePar?->pseudo,
                'decide_le' => $v->decide_le?->toIso8601String(),
                'commentaire' => $v->commentaire,
                'publiee' => $v->id === $sujet->version_publiee_id,
            ]),
            'renvoi' => ($renvoi = $sujet->dernierRenvoi()) ? [
                'commentaire' => $renvoi->commentaire,
                'par' => $renvoi->decidePar?->pseudo,
                'le' => $renvoi->decide_le?->toIso8601String(),
            ] : null,
            // Pour « Ajouter une question » : le programme de la matière.
            'notions' => $brouillon && $classe !== null ? Chapitre::query()
                ->with(['notions' => fn ($q) => $q->orderBy('ordre')])
                ->where('matiere_id', $sujet->matiere_id)
                ->where('classe_id', $classe->id)
                ->orderBy('ordre')
                ->get()
                ->map(fn (Chapitre $c) => [
                    'libelle' => $c->titre,
                    'notions' => $c->notions->map(fn (Notion $n) => ['id' => $n->id, 'titre' => $n->titre])->values(),
                ])->filter(fn (array $g) => $g['notions']->isNotEmpty())->values() : [],
            'types' => collect(TypeQuestion::cases())->map(fn (TypeQuestion $t) => ['valeur' => $t->value, 'libelle' => $t->libelle()]),
            'droits' => [
                'rediger' => Gate::allows('rediger', $sujet),
                'relire' => Gate::allows('relire', $sujet),
                'archiver' => Gate::allows('archiver', $sujet),
                'auteur' => Perimetre::estAuteurDe($user, $sujet),
            ],
        ]);
    }

    public function update(Request $request, Sujet $sujet): RedirectResponse
    {
        Gate::authorize('rediger', $sujet);

        $donnees = $request->validate([
            'titre' => ['required', 'string', 'min:3', 'max:160'],
            'session' => ['required', 'integer', 'between:1990,'.(now()->year + 1)],
            'duree_minutes' => ['nullable', 'integer', 'between:5,600'],
            'coefficient' => ['nullable', 'string', 'max:10'],
            'droits' => ['nullable', 'string', 'max:255'],
            'revision' => ['required', 'integer', 'min:0'],
        ]);

        $this->contenu->enregistrerSujet($sujet, $request->user(), [
            'titre' => trim($donnees['titre']),
            'session' => $donnees['session'],
            'duree_minutes' => $donnees['duree_minutes'] ?? null,
            'coefficient' => isset($donnees['coefficient']) ? trim($donnees['coefficient']) : null,
            'droits' => isset($donnees['droits']) ? trim($donnees['droits']) : null,
        ], $donnees['revision']);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Renseignements enregistrés.']);

        return to_route('contenu.annales.show', $sujet);
    }

    /** Le document original : jamais servi sans la policy, jamais mis en cache public. */
    public function document(Sujet $sujet): StreamedResponse
    {
        Gate::authorize('document', $sujet);

        return self::servirDocument($sujet);
    }

    public static function servirDocument(Sujet $sujet): StreamedResponse
    {
        $disque = Storage::disk(config('annales.disque'));

        abort_unless($sujet->document_chemin !== null && $disque->exists($sujet->document_chemin), 404);

        return $disque->response($sujet->document_chemin, $sujet->document_nom, [
            'Content-Type' => $sujet->document_type ?? 'application/octet-stream',
            'Cache-Control' => 'private, max-age=86400',
            'X-Content-Type-Options' => 'nosniff',
        ], 'inline');
    }

    public function soumettre(Request $request, Sujet $sujet): RedirectResponse
    {
        Gate::authorize('rediger', $sujet);
        $this->sujets->soumettre($sujet, $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Annale envoyée en relecture, avec ses questions.']);

        return to_route('contenu.annales.show', $sujet);
    }

    public function reprendre(Request $request, Sujet $sujet): RedirectResponse
    {
        Gate::authorize('rediger', $sujet);
        $this->sujets->reprendre($sujet, $request->user());

        return to_route('contenu.annales.show', $sujet);
    }

    public function modifier(Request $request, Sujet $sujet): RedirectResponse
    {
        Gate::authorize('rediger', $sujet);
        $this->contenu->ouvrirModification($sujet, $request->user());

        return to_route('contenu.annales.show', $sujet);
    }

    public function publier(Request $request, Sujet $sujet): RedirectResponse
    {
        Gate::authorize('relire', $sujet);
        $donnees = $request->validate(['commentaire' => ['nullable', 'string', 'max:2000']]);

        $this->sujets->publier($sujet, $request->user(), $donnees['commentaire'] ?? null);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Annale publiée : les élèves de cet examen la reçoivent.']);

        return to_route('contenu.annales.show', $sujet);
    }

    public function renvoyer(Request $request, Sujet $sujet): RedirectResponse
    {
        Gate::authorize('relire', $sujet);
        $donnees = $request->validate(['commentaire' => ['required', 'string', 'max:2000']]);

        $this->sujets->renvoyer($sujet, $request->user(), $donnees['commentaire']);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Annale renvoyée à son auteur.']);

        return to_route('contenu.annales.relecture');
    }

    public function archiver(Request $request, Sujet $sujet): RedirectResponse
    {
        Gate::authorize('archiver', $sujet);
        $this->contenu->archiver($sujet, $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Annale retirée : les élèves ne la voient plus.']);

        return to_route('contenu.annales.show', $sujet);
    }

    public function restaurer(Request $request, Sujet $sujet): RedirectResponse
    {
        Gate::authorize('archiver', $sujet);
        $this->contenu->restaurer($sujet, $request->user());

        return to_route('contenu.annales.show', $sujet);
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
            'examen' => $request->integer('examen') ?: null,
            'recherche' => $request->string('recherche')->trim()->toString(),
        ];

        $base = Sujet::query()->when($vue === 'miennes', fn (Builder $q) => $q->where('auteur_id', $user->id));

        if ($vue === 'a_relire') {
            self::aRelirePar($base, $user);
        }

        $compteurs = (clone $base)->toBase()
            ->selectRaw('statut, count(*) as nombre')
            ->groupBy('statut')
            ->pluck('nombre', 'statut');

        $requete = (clone $base)
            ->with(['examen', 'serie', 'matiere', 'auteur'])
            ->withCount([
                'questions',
                'questions as questions_a_verifier_count' => fn (Builder $q) => $q->where('reponse_a_verifier', true),
            ])
            ->when($filtres['statut'], fn (Builder $q, string $statut) => $q->where('statut', $statut))
            ->when($filtres['matiere'], fn (Builder $q, int $matiere) => $q->where('matiere_id', $matiere))
            ->when($filtres['examen'], fn (Builder $q, int $examen) => $q->where('examen_id', $examen));

        RechercheTexte::appliquer($requete, $filtres['recherche'], ['titre', 'matiere.nom']);

        $sujets = $requete->orderByDesc('session')->orderByDesc('updated_at')->paginate(20)->withQueryString();

        // Ses imports à suivre : en lecture, en échec, ou dont l'annale est
        // encore un brouillon. Une annale envoyée en relecture sort de la
        // liste (on la retrouve plus bas).
        $imports = ImportSujet::query()
            ->with(['matiere', 'examen', 'serie', 'sujet'])
            ->where('auteur_id', $user->id)
            ->where(fn (Builder $q) => $q->where('statut', '!=', StatutImport::Pret->value)
                ->orWhereHas('sujet', fn (Builder $s) => $s->where('statut', StatutContenu::Brouillon->value)->whereNull('version_publiee_id')))
            ->latest('id')
            ->limit(6)
            ->get();

        return Inertia::render('contenu/annales/index', [
            'sujets' => [
                'donnees' => collect($sujets->items())->map(fn (Sujet $s) => [
                    ...$this->presenter($s, $user),
                    'questions' => (int) $s->getAttribute('questions_count'),
                    'a_verifier' => (int) $s->getAttribute('questions_a_verifier_count'),
                ]),
                'page' => $sujets->currentPage(),
                'derniere' => $sujets->lastPage(),
                'total' => $sujets->total(),
            ],
            'imports' => $imports->map(fn (ImportSujet $i) => ImportAnnaleController::presenter($i))->values(),
            'filtres' => $filtres,
            'compteurs' => collect(StatutContenu::cases())->mapWithKeys(fn (StatutContenu $s) => [$s->value => (int) ($compteurs[$s->value] ?? 0)]),
            'a_relire' => $user->can(Permission::RelireContenu->value) ? self::nombreARelire($user) : null,
            'lecons_a_relire' => $user->can(Permission::RelireContenu->value) ? LeconController::nombreARelire($user) : null,
            'questions_a_relire' => $user->can(Permission::RelireContenu->value) ? QuestionController::nombreARelire($user) : null,
            'peut_importer' => $user->can(Permission::ImporterAnnales->value),
            'matieres' => Matiere::query()->orderBy('ordre')->get(['id', 'nom', 'teinte']),
            'examens' => Examen::query()->orderBy('ordre')->get(['id', 'code', 'nom']),
        ]);
    }

    /**
     * Les annales des autres qui attendent une décision de ce relecteur.
     *
     * @param  Builder<Sujet>  $requete
     */
    private static function aRelirePar(Builder $requete, User $user): void
    {
        $requete->where('statut', StatutContenu::EnRelecture)
            ->where(fn (Builder $q) => $q->whereNull('auteur_id')->orWhere('auteur_id', '!=', $user->id))
            ->whereDoesntHave('versions', fn (Builder $q) => $q->whereNull('decision')->where('auteur_id', $user->id));
    }

    public static function nombreARelire(User $user): int
    {
        $requete = Sujet::query();
        self::aRelirePar($requete, $user);

        return $requete->count();
    }

    /**
     * @return array<string, mixed>
     */
    private function presenter(Sujet $sujet, User $user): array
    {
        return [
            'uuid' => $sujet->uuid,
            'titre' => $sujet->titre,
            'session' => $sujet->session,
            'libelle_session' => $sujet->libelleSession(),
            'examen' => $sujet->examen->code->value,
            'serie' => $sujet->serie?->code->value,
            'type' => $sujet->type->value,
            'type_libelle' => $sujet->type->libelle(),
            'matiere' => ['nom' => $sujet->matiere->nom, 'teinte' => $sujet->matiere->teinte->value],
            'statut' => $sujet->statut->value,
            'publiee' => $sujet->version_publiee_id !== null,
            'est_exemple' => $sujet->est_exemple,
            'officiel_sans_droits' => $sujet->type === TypeSujet::Officiel && blank($sujet->droits),
            'a_document' => $sujet->document_chemin !== null,
            'auteur' => $sujet->auteur->pseudo ?? 'Équipe',
            'de_moi' => $sujet->auteur_id === $user->id,
            'modifiee_le' => $sujet->updated_at->toIso8601String(),
        ];
    }
}
