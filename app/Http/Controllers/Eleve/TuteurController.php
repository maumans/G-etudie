<?php

namespace App\Http\Controllers\Eleve;

use App\Enums\DemandeTuteur;
use App\Enums\MotifSignalementTuteur;
use App\Enums\StatutReponseTuteur;
use App\Http\Controllers\Controller;
use App\Models\ConversationTuteur;
use App\Models\Epreuve;
use App\Models\MessageTuteur;
use App\Models\User;
use App\Services\Tuteur\DemandeRefusee;
use App\Services\Tuteur\TuteurService;
use App\Support\CatalogueEleve;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as ReponseVide;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Le tuteur N'karamögö côté élève (lot 10, PLAN M11). **En ligne
 * seulement** (HORS_LIGNE.md A.2, niveau C) : aucune demande ne passe par
 * la file d'opérations — une explication s'écrit pendant que l'élève la lit.
 *
 *  - « Mon tuteur » : poser une question libre dans une de ses matières,
 *    relire ses conversations, son quota du jour ;
 *  - `demander` : une demande, et la réponse en flux (SSE). Tout refus
 *    (quota, corrigé réservé, explication déjà en cours) arrive **avant**
 *    le flux, en JSON avec son statut ;
 *  - « Signaler cette réponse ».
 *
 * Toutes les règles sont dans TuteurService ; une conversation d'un autre
 * élève répond 404.
 */
class TuteurController extends Controller
{
    public function index(Request $request, TuteurService $tuteur): Response
    {
        return $this->page($request, $tuteur, null);
    }

    public function show(Request $request, TuteurService $tuteur, ConversationTuteur $conversation): Response
    {
        abort_unless($conversation->user_id === $request->user()->id, 404);

        return $this->page($request, $tuteur, $conversation);
    }

    public function demander(Request $request, TuteurService $tuteur): StreamedResponse|JsonResponse
    {
        $champs = $request->validate([
            'conversation' => ['nullable', 'uuid'],
            'demande' => ['required', Rule::enum(DemandeTuteur::class)],
            'question' => ['nullable', 'uuid'],
            'version' => ['nullable', 'integer', 'min:1'],
            'etape' => ['nullable', 'integer', 'min:0', 'max:20'],
            'reponse' => ['nullable', 'array'],
            'matiere' => ['nullable', 'string', 'max:80'],
            'texte' => ['nullable', 'string', 'max:'.config('tuteur.texte_max')],
        ], [
            'texte.max' => 'Ta question est trop longue : :max caractères au plus.',
        ]);

        try {
            $preparation = $tuteur->preparer($request->user(), $champs);
        } catch (DemandeRefusee $refus) {
            return response()->json(['message' => $refus->getMessage(), 'raison' => $refus->raison], $refus->statut);
        }

        return response()->stream(function () use ($tuteur, $preparation) {
            // L'élève peut fermer la feuille : la réponse finit quand même,
            // pour être gardée (relue dans « Mon tuteur ») et comptée juste.
            ignore_user_abort(true);

            $tuteur->diffuser($preparation, function (string $evenement, array $donnees): void {
                echo 'event: '.$evenement."\n".'data: '.json_encode($donnees, JSON_UNESCAPED_UNICODE)."\n\n";

                if (ob_get_level() > 0) {
                    ob_flush();
                }

                flush();
            });
        }, 200, [
            'Content-Type' => 'text/event-stream; charset=UTF-8',
            'Cache-Control' => 'no-cache, no-transform',
            // Nginx : ne pas retenir le flux (MISE_EN_PRODUCTION.md, lot 10).
            'X-Accel-Buffering' => 'no',
        ]);
    }

    public function signaler(Request $request, TuteurService $tuteur, MessageTuteur $message): ReponseVide
    {
        $champs = $request->validate(['motif' => ['required', Rule::enum(MotifSignalementTuteur::class)]]);

        $tuteur->signaler($request->user(), $message, MotifSignalementTuteur::from($champs['motif']));

        return response()->noContent();
    }

    private function page(Request $request, TuteurService $tuteur, ?ConversationTuteur $active): Response
    {
        /** @var User $eleve */
        $eleve = $request->user();
        $profil = CatalogueEleve::profil($eleve);
        abort_if($profil === null, 404);

        $conversations = ConversationTuteur::query()
            ->where('user_id', $eleve->id)
            ->with('matiere')
            ->withCount(['messages as reponses_count' => fn ($q) => $q->where('role', MessageTuteur::TUTEUR)])
            ->orderByDesc('updated_at')
            ->orderByDesc('id')
            ->limit(30)
            ->get();

        return Inertia::render('eleve/tuteur', [
            'quota' => $tuteur->quota($eleve),
            'matieres' => CatalogueEleve::epreuves($profil)->map(fn (Epreuve $epreuve) => [
                'cle' => $epreuve->matiere->teinte->value,
                'nom' => $epreuve->matiere->nom,
                'slug' => $epreuve->matiere->slug,
            ])->unique('slug')->values(),
            'conversations' => $conversations->map(fn (ConversationTuteur $c) => self::resume($c))->values(),
            'conversation' => $active !== null ? self::detail($active, $tuteur) : null,
            'est_exemple' => $conversations->contains('est_exemple', true),
            'texte_max' => (int) config('tuteur.texte_max'),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public static function resume(ConversationTuteur $conversation): array
    {
        return [
            'uuid' => $conversation->uuid,
            'objet' => $conversation->objet->value,
            'titre' => $conversation->titre,
            'matiere' => $conversation->matiere ? ['cle' => $conversation->matiere->teinte->value, 'nom' => $conversation->matiere->nom] : null,
            'reponses' => (int) ($conversation->reponses_count ?? 0),
            'le' => $conversation->updated_at->toIso8601String(),
            'est_exemple' => $conversation->est_exemple,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private static function detail(ConversationTuteur $conversation, TuteurService $tuteur): array
    {
        $conversation->load(['messages', 'matiere', 'question']);

        return [
            ...self::resume($conversation),
            'question' => $conversation->question?->uuid,
            'relances_restantes' => $tuteur->relancesRestantes($conversation),
            'messages' => $conversation->messages->map(fn (MessageTuteur $m) => [
                'uuid' => $m->uuid,
                'role' => $m->role,
                'texte' => $m->texte,
                'statut' => $m->statut?->value,
                'recentre' => in_array($m->statut, [StatutReponseTuteur::HorsSujet, StatutReponseTuteur::Refus], true),
                'signale' => $m->signale_le !== null,
                'le' => $m->created_at->toIso8601String(),
            ])->values(),
        ];
    }
}
