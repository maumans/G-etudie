<?php

namespace App\Http\Controllers\Contenu;

use App\Enums\StatutReponseTuteur;
use App\Http\Controllers\Controller;
use App\Models\ConversationTuteur;
use App\Models\Matiere;
use App\Models\MessageTuteur;
use App\Models\Question;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Back-office › Tuteur (lot 10, PLAN M11 : « journal des échanges
 * consultable par l'admin contenu pour améliorer les corrigés »).
 *
 * **Sans l'identité des élèves** : ni prénom, ni pseudo, ni numéro. Ce qui
 * sert à l'équipe, c'est la question et ce qui n'a pas été compris : les
 * questions les plus expliquées (un corrigé à reprendre ?) et les réponses
 * signalées par les élèves, en tête. Permission `tuteur.journal`.
 */
class JournalTuteurController extends Controller
{
    public function index(Request $request): Response
    {
        $filtres = [
            'signalees' => $request->boolean('signalees'),
            'matiere' => $request->string('matiere')->trim()->toString() ?: null,
        ];
        $depuis = now()->subDays(7);
        $mois = now()->subDays(30);

        $conversations = ConversationTuteur::query()
            ->with('matiere')
            ->withCount(['messages as reponses_count' => fn (Builder $q) => $q->where('role', MessageTuteur::TUTEUR)])
            ->withMax(['messages as signalee_le' => fn (Builder $q) => $q->whereNotNull('signale_le')->whereNull('signalement_classe_le')], 'signale_le')
            ->when($filtres['signalees'], fn (Builder $q) => $q->whereHas('messages', fn (Builder $m) => $m->whereNotNull('signale_le')->whereNull('signalement_classe_le')))
            ->when($filtres['matiere'], fn (Builder $q, string $slug) => $q->whereHas('matiere', fn (Builder $m) => $m->where('slug', $slug)))
            ->orderByRaw('signalee_le is null')
            ->orderByDesc('updated_at')
            ->orderByDesc('id')
            ->paginate(20)
            ->withQueryString();

        $plusExpliquees = ConversationTuteur::query()->toBase()
            ->selectRaw('question_id, count(*) as nombre, sum(case when objet = ? then 1 else 0 end) as etapes', ['etape'])
            ->whereNotNull('question_id')
            ->where('created_at', '>=', $mois)
            ->groupBy('question_id')
            ->orderByDesc('nombre')
            ->orderBy('question_id')
            ->limit(5)
            ->get();
        $questions = Question::query()->with('notion.chapitre.matiere')->whereKey($plusExpliquees->pluck('question_id'))->get()->keyBy('id');

        $reponses = MessageTuteur::query()->where('role', MessageTuteur::TUTEUR)->where('created_at', '>=', $depuis);

        return Inertia::render('contenu/tuteur/index', [
            'filtres' => $filtres,
            'matieres' => Matiere::query()->orderBy('ordre')->orderBy('id')->get()->map(fn (Matiere $m) => ['slug' => $m->slug, 'nom' => $m->nom])->values(),
            'bilan' => [
                'explications' => (clone $reponses)->where('statut', StatutReponseTuteur::Complete->value)->count(),
                'conversations' => ConversationTuteur::query()->where('created_at', '>=', $depuis)->count(),
                'recentrages' => (clone $reponses)->whereIn('statut', [StatutReponseTuteur::HorsSujet->value, StatutReponseTuteur::Refus->value])->count(),
                'signalements' => MessageTuteur::query()->whereNotNull('signale_le')->whereNull('signalement_classe_le')->count(),
            ],
            'plus_expliquees' => $plusExpliquees->map(function (object $ligne) use ($questions) {
                $question = $questions->get($ligne->question_id);

                return $question === null ? null : [
                    'uuid' => $question->uuid,
                    'extrait' => $question->extrait ?: 'Question sans texte',
                    'matiere' => ['cle' => $question->notion->chapitre->matiere->teinte->value, 'nom' => $question->notion->chapitre->matiere->nom],
                    'notion' => $question->notion->titre,
                    'conversations' => (int) $ligne->nombre,
                    'etapes' => (int) $ligne->etapes,
                ];
            })->filter()->values(),
            'conversations' => [
                'donnees' => collect($conversations->items())->map(fn (ConversationTuteur $c) => [
                    'uuid' => $c->uuid,
                    'objet' => $c->objet->value,
                    'titre' => $c->titre,
                    'matiere' => $c->matiere ? ['cle' => $c->matiere->teinte->value, 'nom' => $c->matiere->nom] : null,
                    'reponses' => (int) $c->reponses_count,
                    'signalee' => $c->getAttribute('signalee_le') !== null,
                    'le' => $c->updated_at->toIso8601String(),
                    'est_exemple' => $c->est_exemple,
                ])->values(),
                'page' => $conversations->currentPage(),
                'derniere' => $conversations->lastPage(),
                'total' => $conversations->total(),
            ],
        ]);
    }

    public function show(ConversationTuteur $conversation): Response
    {
        $conversation->load(['messages', 'matiere', 'question', 'notion.chapitre']);

        return Inertia::render('contenu/tuteur/fiche', [
            'conversation' => [
                'uuid' => $conversation->uuid,
                'objet' => $conversation->objet->value,
                'titre' => $conversation->titre,
                'matiere' => $conversation->matiere ? ['cle' => $conversation->matiere->teinte->value, 'nom' => $conversation->matiere->nom] : null,
                'notion' => $conversation->notion ? $conversation->notion->chapitre->titre.' › '.$conversation->notion->titre : null,
                'question' => $conversation->question?->uuid,
                'version' => $conversation->version,
                'etape' => $conversation->etape,
                'le' => $conversation->created_at->toIso8601String(),
                'est_exemple' => $conversation->est_exemple,
                'messages' => $conversation->messages->map(fn (MessageTuteur $m) => [
                    'uuid' => $m->uuid,
                    'role' => $m->role,
                    'texte' => $m->texte,
                    'statut' => $m->statut?->value,
                    'statut_libelle' => $m->statut?->libelle(),
                    'depuis_cache' => $m->depuis_cache,
                    'modele' => $m->modele,
                    'premier_mot_ms' => $m->premier_mot_ms,
                    'signale' => $m->signale_motif?->libelle(),
                    'signalement_classe' => $m->signalement_classe_le !== null,
                    'le' => $m->created_at->toIso8601String(),
                ])->values(),
            ],
        ]);
    }

    /** « Classer » un signalement : l'équipe l'a lu et a corrigé ce qu'il fallait. */
    public function classer(MessageTuteur $message): RedirectResponse
    {
        abort_if($message->signale_le === null, 404);

        if ($message->signalement_classe_le === null) {
            $message->forceFill(['signalement_classe_le' => now()])->save();
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Signalement classé.']);

        return back();
    }
}
