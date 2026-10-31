<?php

namespace App\Http\Controllers\Contenu;

use App\Enums\Permission;
use App\Enums\StatutContenu;
use App\Enums\TypeQuestion;
use App\Http\Controllers\Controller;
use App\Models\Chapitre;
use App\Models\Matiere;
use App\Models\Notion;
use App\Models\Question;
use App\Models\User;
use App\Models\VersionContenu;
use App\Services\ContenuService;
use App\Support\BlocsContenu;
use App\Support\FormatQuestion;
use App\Support\Perimetre;
use App\Support\PresentationQuestion;
use App\Support\RechercheTexte;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Back-office › Questions (PLAN M5, M17) : la liste et sa file de relecture,
 * la création (type et notion), l'écran de saisie avec son aperçu « comme
 * l'élève la verra », la fiche (relecture, versions). Toute transition passe
 * par ContenuService, comme pour les leçons ; la policy dit qui voit quel
 * bouton.
 */
class QuestionController extends Controller
{
    private const VUES = ['toutes', 'miennes', 'a_relire'];

    public function __construct(private ContenuService $contenu) {}

    public function index(Request $request): Response
    {
        return $this->liste($request, $request->string('vue')->toString());
    }

    /** File de relecture : les questions des autres qui attendent une décision. */
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

        return Inertia::render('contenu/questions/creer', [
            'groupes' => $chapitres->values()->map(fn (Chapitre $c) => [
                'libelle' => "{$c->matiere->nom} · {$c->classe->nom} · {$c->titre}",
                'teinte' => $c->matiere->teinte->value,
                'notions' => $c->notions->map(fn (Notion $n) => ['id' => $n->id, 'titre' => $n->titre]),
            ]),
            'types' => collect(TypeQuestion::cases())->map(fn (TypeQuestion $t) => ['valeur' => $t->value, 'libelle' => $t->libelle()]),
            'notion_id' => $request->integer('notion') ?: null,
            'type' => TypeQuestion::tryFrom($request->string('type')->toString())?->value,
            'peut_saisir_programme' => $request->user()->can(Permission::GererReferentiel->value),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $donnees = $request->validate([
            'notion_id' => ['required', 'integer', Rule::exists('notions', 'id')],
            'type' => ['required', Rule::enum(TypeQuestion::class)],
        ]);

        $question = $this->contenu->creerQuestion(
            $request->user(),
            Notion::query()->whereKey($donnees['notion_id'])->firstOrFail(),
            TypeQuestion::from($donnees['type']),
        );

        return to_route('contenu.questions.edit', $question);
    }

    public function show(Request $request, Question $question): Response
    {
        Gate::authorize('view', $question);

        $question->load(['notion.chapitre.matiere', 'notion.chapitre.classe', 'auteur', 'versions.auteur', 'versions.decidePar', 'partie.sujet']);
        $user = $request->user();
        $enRelecture = $question->versionEnRelecture();

        // Version affichée : celle demandée, sinon celle qui attend le
        // relecteur, sinon la publiée ; le brouillon en dernier recours.
        $choisie = $question->versions->firstWhere('numero', $request->integer('version'))
            ?? $enRelecture
            ?? $question->versions->firstWhere('id', $question->version_publiee_id);

        return Inertia::render('contenu/questions/fiche', [
            'question' => $this->presenter($question, $user),
            'affichee' => [
                'source' => $choisie !== null ? 'version' : 'brouillon',
                'numero' => $choisie?->numero,
                'question' => $choisie !== null
                    ? PresentationQuestion::depuisVersion($question, $choisie)
                    : PresentationQuestion::brouillon($question),
            ],
            'versions' => $question->versions->map(fn (VersionContenu $v) => [
                'numero' => $v->numero,
                'titre' => $v->titre,
                'auteur' => $v->auteur->pseudo,
                'soumise_le' => $v->soumise_le->toIso8601String(),
                'decision' => $v->decision?->value,
                'decide_par' => $v->decidePar?->pseudo,
                'decide_le' => $v->decide_le?->toIso8601String(),
                'commentaire' => $v->commentaire,
                'publiee' => $v->id === $question->version_publiee_id,
            ]),
            'droits' => [
                'rediger' => Gate::allows('rediger', $question),
                'soumettre' => Gate::allows('soumettre', $question),
                'relire' => Gate::allows('relire', $question),
                'archiver' => Gate::allows('archiver', $question),
                'auteur' => Perimetre::estAuteurDe($user, $question),
            ],
        ]);
    }

    public function edit(Request $request, Question $question): Response|RedirectResponse
    {
        Gate::authorize('rediger', $question);

        if ($question->statut !== StatutContenu::Brouillon) {
            return to_route('contenu.questions.show', $question);
        }

        $question->load(['notion.chapitre.matiere', 'notion.chapitre.classe', 'auteur', 'partie.sujet']);

        return Inertia::render('contenu/questions/edition', [
            'question' => [
                ...$this->presenter($question, $request->user()),
                'enonce' => $question->enonce,
                'donnees' => (object) $question->donnees,
                'attendue' => (object) $question->reponse_attendue,
                'indices' => $question->indices ?? [],
                'corrige' => $question->corrige ?? [],
                'difficulte' => $question->difficulte,
                'revision' => $question->revision,
            ],
            // Ce qui manque avant l'envoi en relecture, dit tout de suite.
            'a_completer' => $question->erreurAvantRelecture(),
            'renvoi' => ($renvoi = $question->dernierRenvoi()) ? [
                'commentaire' => $renvoi->commentaire,
                'par' => $renvoi->decidePar?->pseudo,
                'le' => $renvoi->decide_le?->toIso8601String(),
            ] : null,
            'limites' => [
                'indices' => FormatQuestion::INDICES_MAX,
                'etapes' => FormatQuestion::ETAPES_MAX,
            ],
        ]);
    }

    public function update(Request $request, Question $question): RedirectResponse
    {
        Gate::authorize('rediger', $question);

        $donnees = $request->validate([
            'enonce' => ['required', 'array'],
            'donnees' => ['present', 'array'],
            'attendue' => ['present', 'array'],
            'indices' => ['present', 'array', 'max:'.FormatQuestion::INDICES_MAX],
            'corrige' => ['present', 'array', 'max:'.FormatQuestion::ETAPES_MAX],
            'corrige.*.titre' => ['nullable', 'string', 'max:120'],
            'corrige.*.blocs' => ['required', 'array'],
            'difficulte' => ['required', 'integer', 'between:1,5'],
            'revision' => ['required', 'integer', 'min:0'],
        ]);

        $this->contenu->enregistrerQuestion($question, $request->user(), [
            'enonce' => $donnees['enonce'],
            'donnees' => $donnees['donnees'],
            'attendue' => $donnees['attendue'],
            'indices' => array_values($donnees['indices']),
            'corrige' => array_map(fn (array $etape) => [
                'titre' => trim((string) ($etape['titre'] ?? '')),
                'blocs' => $etape['blocs'],
            ], array_values($donnees['corrige'])),
            'difficulte' => $donnees['difficulte'],
        ], $donnees['revision']);

        return to_route('contenu.questions.edit', $question);
    }

    public function soumettre(Request $request, Question $question): RedirectResponse
    {
        Gate::authorize('soumettre', $question);
        $this->contenu->soumettre($question, $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Question envoyée en relecture.']);

        return to_route('contenu.questions.show', $question);
    }

    public function reprendre(Request $request, Question $question): RedirectResponse
    {
        Gate::authorize('rediger', $question);
        $this->contenu->reprendre($question, $request->user());

        return to_route('contenu.questions.edit', $question);
    }

    public function modifier(Request $request, Question $question): RedirectResponse
    {
        Gate::authorize('rediger', $question);
        $this->contenu->ouvrirModification($question, $request->user());

        return to_route('contenu.questions.edit', $question);
    }

    public function publier(Request $request, Question $question): RedirectResponse
    {
        Gate::authorize('relire', $question);
        $donnees = $request->validate(['commentaire' => ['nullable', 'string', 'max:2000']]);

        $this->contenu->publier($question, $request->user(), $donnees['commentaire'] ?? null);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Question publiée : les élèves la reçoivent.']);

        return to_route('contenu.questions.show', $question);
    }

    public function renvoyer(Request $request, Question $question): RedirectResponse
    {
        Gate::authorize('relire', $question);
        $donnees = $request->validate(['commentaire' => ['required', 'string', 'max:2000']]);

        $this->contenu->renvoyer($question, $request->user(), $donnees['commentaire']);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Question renvoyée à son auteur.']);

        return to_route('contenu.questions.relecture');
    }

    public function archiver(Request $request, Question $question): RedirectResponse
    {
        Gate::authorize('archiver', $question);
        $this->contenu->archiver($question, $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Question retirée : elle n’est plus proposée aux élèves.']);

        return to_route('contenu.questions.show', $question);
    }

    public function restaurer(Request $request, Question $question): RedirectResponse
    {
        Gate::authorize('archiver', $question);
        $this->contenu->restaurer($question, $request->user());

        return to_route('contenu.questions.show', $question);
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
            'type' => TypeQuestion::tryFrom($request->string('type')->toString())?->value,
            'matiere' => $request->integer('matiere') ?: null,
            'recherche' => $request->string('recherche')->trim()->toString(),
        ];

        $base = Question::query()->when($vue === 'miennes', fn (Builder $q) => $q->where('auteur_id', $user->id));

        if ($vue === 'a_relire') {
            self::aRelirePar($base, $user);
        }

        $compteurs = (clone $base)->toBase()
            ->selectRaw('statut, count(*) as nombre')
            ->groupBy('statut')
            ->pluck('nombre', 'statut');

        $requete = (clone $base)
            ->with(['notion.chapitre.matiere', 'notion.chapitre.classe', 'auteur', 'partie.sujet'])
            ->when($filtres['statut'], fn (Builder $q, string $statut) => $q->where('statut', $statut))
            ->when($filtres['type'], fn (Builder $q, string $type) => $q->where('type', $type))
            ->when($filtres['matiere'], fn (Builder $q, int $matiere) => $q->whereHas('notion.chapitre', fn (Builder $c) => $c->where('matiere_id', $matiere)));

        // L'énoncé est du JSON : on cherche dans son extrait en texte.
        RechercheTexte::appliquer($requete, $filtres['recherche'], ['extrait', 'notion.titre', 'notion.chapitre.titre']);

        $questions = $requete->orderByDesc('updated_at')->orderByDesc('id')->paginate(20)->withQueryString();

        return Inertia::render('contenu/questions/index', [
            'questions' => [
                'donnees' => collect($questions->items())->map(fn (Question $q) => $this->presenter($q, $user)),
                'page' => $questions->currentPage(),
                'derniere' => $questions->lastPage(),
                'total' => $questions->total(),
            ],
            'filtres' => $filtres,
            'compteurs' => collect(StatutContenu::cases())->mapWithKeys(fn (StatutContenu $s) => [$s->value => (int) ($compteurs[$s->value] ?? 0)]),
            'a_relire' => $user->can(Permission::RelireContenu->value) ? self::nombreARelire($user) : null,
            'lecons_a_relire' => $user->can(Permission::RelireContenu->value) ? LeconController::nombreARelire($user) : null,
            'annales_a_relire' => $user->can(Permission::RelireContenu->value) ? AnnaleController::nombreARelire($user) : null,
            'matieres' => Matiere::query()->orderBy('ordre')->get(['id', 'nom', 'teinte']),
            'types' => collect(TypeQuestion::cases())->map(fn (TypeQuestion $t) => ['valeur' => $t->value, 'libelle' => $t->libelle()]),
        ]);
    }

    /**
     * Les questions des autres qui attendent une décision de ce relecteur.
     *
     * @param  Builder<Question>  $requete
     */
    private static function aRelirePar(Builder $requete, User $user): void
    {
        $requete->where('statut', StatutContenu::EnRelecture)
            // Une question d'annale se relit avec son sujet (SujetService).
            ->whereNull('sujet_partie_id')
            ->where(fn (Builder $q) => $q->whereNull('auteur_id')->orWhere('auteur_id', '!=', $user->id))
            ->whereDoesntHave('versions', fn (Builder $q) => $q->whereNull('decision')->where('auteur_id', $user->id));
    }

    public static function nombreARelire(User $user): int
    {
        $requete = Question::query();
        self::aRelirePar($requete, $user);

        return $requete->count();
    }

    /**
     * @return array<string, mixed>
     */
    private function presenter(Question $question, User $user): array
    {
        $chapitre = $question->notion->chapitre;

        return [
            'uuid' => $question->uuid,
            'titre' => $question->extrait !== '' ? $question->extrait : 'Question sans texte',
            'type' => $question->type->value,
            'type_libelle' => $question->type->libelle(),
            'difficulte' => $question->difficulte,
            'statut' => $question->statut->value,
            'publiee' => $question->version_publiee_id !== null,
            'est_exemple' => $question->est_exemple,
            'auteur' => $question->auteur->pseudo ?? 'Équipe',
            'de_moi' => $question->auteur_id === $user->id,
            'modifiee_le' => $question->updated_at->toIso8601String(),
            'matiere' => ['nom' => $chapitre->matiere->nom, 'teinte' => $chapitre->matiere->teinte->value],
            'classe' => $chapitre->classe->nom,
            'chapitre' => $chapitre->titre,
            'notion' => $question->notion->titre,
            'indices' => count($question->indices ?? []),
            'etapes' => count($question->corrige ?? []),
            'mots' => BlocsContenu::resume($question->enonce)['mots'],
            'annale' => $question->partie === null ? null : [
                'uuid' => $question->partie->sujet->uuid,
                'titre' => $question->partie->sujet->titre,
                'partie' => $question->partie->titre,
                'a_verifier' => $question->reponse_a_verifier,
            ],
        ];
    }
}
