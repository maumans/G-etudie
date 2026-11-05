<?php

namespace App\Http\Controllers\Eleve;

use App\Http\Controllers\Contenu\AnnaleController as AnnaleBackOffice;
use App\Http\Controllers\Controller;
use App\Models\AnneeScolaire;
use App\Models\Chapitre;
use App\Models\Epreuve;
use App\Models\Matiere;
use App\Models\ProfilEleve;
use App\Models\Question;
use App\Models\Sujet;
use App\Models\SujetPartie;
use App\Models\Tentative;
use App\Support\CatalogueEleve;
use App\Support\PresentationSujet;
use App\Support\RechercheTexte;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Annales côté élève (PLAN M6) : la liste (par matière, session) et la vue
 * « Exercices par chapitre » — « tous les exercices de probabilités tombés
 * au Bac SE depuis 2010 » —, puis un sujet en deux modes : **Lecture**
 * (énoncé et corrigé) et **Entraînement** (question par question, indices,
 * réponses par la file). Le mode « Conditions réelles » arrive avec
 * l'examen blanc (lot 5).
 *
 * Ce que l'élève voit vient de CatalogueEleve ; un sujet hors de son examen
 * répond 404 (SujetPolicy::lire).
 */
class AnnaleController extends Controller
{
    private const PAR_PAGE = 12;

    public function index(Request $request): Response
    {
        $profil = $this->profil($request);
        $vue = $request->string('vue')->toString() === 'exercices' ? 'exercices' : 'sujets';
        $matieres = Matiere::query()->whereIn('id', CatalogueEleve::matieresIds($profil))->orderBy('ordre')->get()->keyBy('slug');
        $matiere = $matieres->get($request->string('matiere')->toString());

        $filtres = [
            'vue' => $vue,
            'matiere' => $matiere?->slug,
            'session' => $request->integer('session') ?: null,
            'chapitre' => $request->integer('chapitre') ?: null,
            'recherche' => $request->string('recherche')->trim()->toString(),
        ];

        $tousSujets = CatalogueEleve::sujets($profil)->get(['id', 'matiere_id', 'session', 'est_exemple']);
        $faites = Tentative::query()->where('user_id', $request->user()->id)->distinct()->pluck('question_id')->flip();

        return Inertia::render('eleve/annales', [
            'examen' => $profil->libelleExamen(),
            'filtres' => $filtres,
            'est_exemple' => $tousSujets->contains('est_exemple', true),
            'resume' => [
                'sujets' => $tousSujets->count(),
                'premiere' => $tousSujets->min('session'),
                'derniere' => $tousSujets->max('session'),
                'exercices' => $this->questionsAnnales($profil)->count(),
                'faits' => $this->questionsAnnales($profil)->whereIn('id', $faites->keys())->count(),
            ],
            'matieres' => $matieres->values()->map(fn (Matiere $m) => [
                'slug' => $m->slug,
                'nom' => $m->nom,
                'cle' => $m->teinte->value,
                'sujets' => $tousSujets->where('matiere_id', $m->id)->count(),
            ])->filter(fn (array $m) => $m['sujets'] > 0)->values(),
            'sessions' => $tousSujets->pluck('session')->unique()->sortDesc()->values(),
            'chapitres' => $this->chapitres($profil, $matiere),
            'sujets' => $vue === 'sujets' ? $this->sujets($request, $profil, $matiere, $filtres, $faites) : null,
            'exercices' => $vue === 'exercices' ? $this->exercices($profil, $matiere, $filtres, $faites) : null,
        ]);
    }

    public function show(Request $request, Sujet $sujet): Response
    {
        Gate::authorize('lire', $sujet);

        $sujet->load(['versionPubliee', 'examen', 'serie', 'matiere']);
        $contenu = PresentationSujet::publiee($sujet) ?? abort(404);
        $uuids = [];

        foreach ($contenu['parties'] as $partie) {
            foreach ($partie['questions'] as $question) {
                $uuids[] = $question['uuid'];
            }
        }

        // Le dernier score de l'élève sur chaque question (reprise, progression).
        $scores = Tentative::query()
            ->join('questions', 'questions.id', '=', 'tentatives.question_id')
            ->where('tentatives.user_id', $request->user()->id)
            ->whereIn('questions.uuid', $uuids)
            ->orderBy('tentatives.saisi_le')
            ->get(['questions.uuid as question', 'tentatives.score'])
            ->mapWithKeys(fn (Tentative $t) => [$t->getAttribute('question') => $t->score]);

        $mode = in_array($request->string('mode')->toString(), ['entrainement', 'examen'], true)
            ? $request->string('mode')->toString()
            : 'lecture';

        return Inertia::render('eleve/annale', [
            'sujet' => $contenu,
            'mode' => $mode,
            'question' => $request->string('question')->toString() ?: null,
            'scores' => (object) $scores->all(),
            // Lot 5 : la durée de l'épreuve saisie par l'équipe, quand
            // l'annale n'imprime pas la sienne (sinon, l'élève choisit).
            'duree_epreuve' => $this->dureeEpreuve($sujet),
        ]);
    }

    /** La durée de l'épreuve de l'année courante (examen, série, filière, matière). */
    private function dureeEpreuve(Sujet $sujet): ?int
    {
        $annee = AnneeScolaire::courante();

        if ($annee === null) {
            return null;
        }

        $epreuve = Epreuve::query()
            ->where('annee_scolaire_id', $annee->id)
            ->where('examen_id', $sujet->examen_id)
            ->where('matiere_id', $sujet->matiere_id)
            ->where('filiere', $sujet->filiere->value)
            ->where(fn (Builder $q) => $sujet->serie_id === null ? $q->whereNull('serie_id') : $q->where('serie_id', $sujet->serie_id))
            ->first();

        return $epreuve?->duree_minutes;
    }

    public function document(Sujet $sujet): StreamedResponse
    {
        Gate::authorize('lire', $sujet);
        Gate::authorize('document', $sujet);

        return AnnaleBackOffice::servirDocument($sujet);
    }

    /**
     * @param  array<string, mixed>  $filtres
     * @param  Collection<int, int>  $faites
     * @return array<string, mixed>
     */
    private function sujets(Request $request, ProfilEleve $profil, ?Matiere $matiere, array $filtres, $faites): array
    {
        $requete = CatalogueEleve::sujets($profil, $matiere)
            ->with(['matiere', 'examen', 'serie'])
            ->withCount(['questions' => fn (Builder $q) => $q->whereNotNull('questions.version_publiee_id')])
            ->when($filtres['session'], fn (Builder $q, int $session) => $q->where('session', $session))
            ->when($filtres['chapitre'], fn (Builder $q, int $chapitre) => $q->whereHas('questions.notion', fn (Builder $n) => $n->where('chapitre_id', $chapitre)));

        RechercheTexte::appliquer($requete, $filtres['recherche'], ['titre', 'matiere.nom']);

        $page = $requete->orderByDesc('session')->orderBy('matiere_id')->paginate(self::PAR_PAGE)->withQueryString();
        $ids = collect($page->items())->pluck('id');
        $questions = Question::query()
            ->join('sujet_parties', 'sujet_parties.id', '=', 'questions.sujet_partie_id')
            ->whereIn('sujet_parties.sujet_id', $ids)
            ->whereNotNull('questions.version_publiee_id')
            ->get(['questions.id', 'sujet_parties.sujet_id']);

        return [
            'donnees' => collect($page->items())->map(fn (Sujet $s) => [
                'uuid' => $s->uuid,
                'titre' => $s->titre,
                'libelle_session' => $s->libelleSession(),
                'session' => $s->session,
                'origine' => $s->type->value,
                'matiere' => ['cle' => $s->matiere->teinte->value, 'nom' => $s->matiere->nom],
                'duree_minutes' => $s->duree_minutes,
                'questions' => (int) $s->getAttribute('questions_count'),
                'faites' => $questions->where('sujet_id', $s->id)->filter(fn (Question $q) => $faites->has($q->id))->count(),
                'est_exemple' => $s->est_exemple,
            ])->values(),
            'page' => $page->currentPage(),
            'derniere' => $page->lastPage(),
            'total' => $page->total(),
        ];
    }

    /**
     * Les exercices d'annales d'un chapitre (ou de tous), du plus récent au
     * plus ancien : la vue que les élèves n'ont nulle part ailleurs.
     *
     * @param  array<string, mixed>  $filtres
     * @param  Collection<int, int>  $faites
     * @return array<string, mixed>
     */
    private function exercices(ProfilEleve $profil, ?Matiere $matiere, array $filtres, $faites): array
    {
        $requete = $this->questionsAnnales($profil, $matiere)
            ->with(['notion.chapitre.matiere', 'partie.sujet.examen', 'partie.sujet.serie'])
            ->when($filtres['chapitre'], fn (Builder $q, int $chapitre) => $q->whereHas('notion', fn (Builder $n) => $n->where('chapitre_id', $chapitre)))
            ->when($filtres['session'], fn (Builder $q, int $session) => $q->whereHas('partie.sujet', fn (Builder $s) => $s->where('session', $session)));

        RechercheTexte::appliquer($requete, $filtres['recherche'], ['extrait', 'notion.titre', 'notion.chapitre.titre']);

        // Tri par sous-requêtes : une jointure sur `sujets` rendrait ambiguës
        // les colonnes `statut` et `version_publiee_id` du catalogue.
        $partie = fn (string $colonne) => SujetPartie::query()->select($colonne)->whereColumn('sujet_parties.id', 'questions.sujet_partie_id');

        $page = $requete
            ->orderByDesc(Sujet::query()->select('session')->whereIn('id', $partie('sujet_id')))
            ->orderBy($partie('ordre'))
            ->orderBy('ordre_sujet')
            ->paginate(self::PAR_PAGE)
            ->withQueryString();

        return [
            'donnees' => collect($page->items())->map(fn (Question $q) => [
                'uuid' => $q->uuid,
                'titre' => $q->extrait !== '' ? $q->extrait : 'Question',
                'type' => $q->type->value,
                'difficulte' => $q->difficulte,
                'matiere' => ['cle' => $q->notion->chapitre->matiere->teinte->value, 'nom' => $q->notion->chapitre->matiere->nom],
                'chapitre' => $q->notion->chapitre->titre,
                'notion' => $q->notion->titre,
                'sujet' => $q->partie->sujet->uuid,
                'libelle_session' => $q->partie->sujet->libelleSession(),
                'partie' => $q->partie->titre,
                'faite' => $faites->has($q->id),
                'est_exemple' => $q->est_exemple,
            ])->values(),
            'page' => $page->currentPage(),
            'derniere' => $page->lastPage(),
            'total' => $page->total(),
        ];
    }

    /**
     * Les chapitres où des annales ont des exercices, avec leur nombre.
     *
     * @return list<array{id: int, titre: string, matiere: string, cle: string, exercices: int}>
     */
    private function chapitres(ProfilEleve $profil, ?Matiere $matiere): array
    {
        $nombres = $this->questionsAnnales($profil, $matiere)
            ->join('notions', 'notions.id', '=', 'questions.notion_id')
            ->toBase()
            ->selectRaw('notions.chapitre_id, count(*) as nombre')
            ->groupBy('notions.chapitre_id')
            ->pluck('nombre', 'chapitre_id');

        return array_values(Chapitre::query()
            ->with('matiere')
            ->whereKey($nombres->keys())
            ->get()
            ->sortBy(fn (Chapitre $c) => [$c->matiere->ordre, $c->ordre])
            ->map(fn (Chapitre $c) => [
                'id' => $c->id,
                'titre' => $c->titre,
                'matiere' => $c->matiere->nom,
                'cle' => $c->matiere->teinte->value,
                'exercices' => (int) $nombres[$c->id],
            ])
            ->values()
            ->all());
    }

    /**
     * Les questions d'annales que l'élève peut recevoir.
     *
     * @return Builder<Question>
     */
    private function questionsAnnales(ProfilEleve $profil, ?Matiere $matiere = null): Builder
    {
        return CatalogueEleve::questions($profil, $matiere)
            ->whereNotNull('questions.sujet_partie_id')
            ->whereHas('partie.sujet', fn (Builder $s) => $s->whereIn('sujets.id', CatalogueEleve::sujets($profil)->select('sujets.id')));
    }

    private function profil(Request $request): ProfilEleve
    {
        return CatalogueEleve::profil($request->user()) ?? abort(404);
    }
}
