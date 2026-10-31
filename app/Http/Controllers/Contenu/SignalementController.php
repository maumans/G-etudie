<?php

namespace App\Http\Controllers\Contenu;

use App\Enums\CibleSignalement;
use App\Enums\DecisionRelecture;
use App\Enums\MotifSignalement;
use App\Enums\StatutSignalement;
use App\Http\Controllers\Controller;
use App\Models\Lecon;
use App\Models\Question;
use App\Models\Signalement;
use App\Models\Sujet;
use App\Models\VersionContenu;
use App\Services\SignalementService;
use App\Support\PresentationQuestion;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Back-office › Signalements (PLAN M17) : la file des erreurs signalées par
 * les élèves, la fiche (le contenu tel que l'élève l'a vu, un lien pour le
 * corriger) et la réponse. De l'élève, on ne montre que son pseudo.
 */
class SignalementController extends Controller
{
    public function __construct(private SignalementService $signalements) {}

    public function index(Request $request): Response
    {
        $filtres = [
            'statut' => $request->has('statut')
                ? StatutSignalement::tryFrom($request->string('statut')->toString())?->value
                : StatutSignalement::Ouvert->value,
            'motif' => MotifSignalement::tryFrom($request->string('motif')->toString())?->value,
            'cible' => CibleSignalement::tryFrom($request->string('cible')->toString())?->value,
        ];

        $compteurs = Signalement::query()->toBase()
            ->selectRaw('statut, count(*) as nombre')
            ->groupBy('statut')
            ->pluck('nombre', 'statut');

        $liste = Signalement::query()
            ->with(['eleve', 'traitePar'])
            ->when($filtres['statut'], fn (Builder $q, string $statut) => $q->where('statut', $statut))
            ->when($filtres['motif'], fn (Builder $q, string $motif) => $q->where('motif', $motif))
            ->when($filtres['cible'], fn (Builder $q, string $cible) => $q->where('cible_type', $cible))
            ->orderByRaw("statut = 'ouvert' desc")
            ->orderBy('created_at')
            ->paginate(20)
            ->withQueryString();

        // Les cibles d'une page, chargées par type (pas une requête par ligne).
        $cibles = collect($liste->items())
            ->groupBy(fn (Signalement $s) => $s->cible_type->value)
            ->map(function ($groupe, string $type) {
                $modele = CibleSignalement::from($type)->modele();
                $avec = match ($type) {
                    'question', 'lecon' => ['notion.chapitre.matiere'],
                    default => ['matiere', 'examen', 'serie'],
                };

                return $modele::query()->with($avec)->whereKey($groupe->pluck('cible_id'))->get()->keyBy('id');
            });

        return Inertia::render('contenu/signalements/index', [
            'signalements' => [
                'donnees' => collect($liste->items())->map(fn (Signalement $s) => $this->presenter($s, $cibles[$s->cible_type->value][$s->cible_id] ?? null)),
                'page' => $liste->currentPage(),
                'derniere' => $liste->lastPage(),
                'total' => $liste->total(),
            ],
            'filtres' => $filtres,
            'compteurs' => collect(StatutSignalement::cases())->mapWithKeys(fn (StatutSignalement $s) => [$s->value => (int) ($compteurs[$s->value] ?? 0)]),
            'motifs' => collect(MotifSignalement::cases())->map(fn (MotifSignalement $m) => ['valeur' => $m->value, 'libelle' => $m->libelle()]),
            'cibles' => collect(CibleSignalement::cases())->map(fn (CibleSignalement $c) => ['valeur' => $c->value, 'libelle' => $c->libelle()]),
        ]);
    }

    public function show(Signalement $signalement): Response
    {
        Gate::authorize('traiter', $signalement);

        $signalement->load(['eleve', 'traitePar']);
        $cible = $signalement->cible();

        if ($cible instanceof Question || $cible instanceof Lecon) {
            $cible->load('notion.chapitre.matiere');
        } elseif ($cible instanceof Sujet) {
            $cible->load(['matiere', 'examen', 'serie']);
        }

        return Inertia::render('contenu/signalements/fiche', [
            'signalement' => [
                ...$this->presenter($signalement, $cible),
                'reponse_vue' => $signalement->reponse_vue_le !== null,
                'autres' => Signalement::query()
                    ->where('cible_type', $signalement->cible_type->value)
                    ->where('cible_id', $signalement->cible_id)
                    ->whereKeyNot($signalement->id)
                    ->count(),
            ],
            // La question telle que l'élève l'a vue (sa version), pour juger.
            'question' => $cible instanceof Question ? $this->questionVue($cible, $signalement->version) : null,
            'statuts' => [
                ['valeur' => StatutSignalement::Traite->value, 'libelle' => 'Corrigé : l’erreur est réparée'],
                ['valeur' => StatutSignalement::Rejete->value, 'libelle' => 'Sans suite : le contenu est juste'],
            ],
        ]);
    }

    public function repondre(Request $request, Signalement $signalement): RedirectResponse
    {
        Gate::authorize('traiter', $signalement);

        $donnees = $request->validate([
            'statut' => ['required', Rule::in([StatutSignalement::Traite->value, StatutSignalement::Rejete->value])],
            'reponse' => ['required', 'string', 'max:2000'],
        ]);

        $this->signalements->repondre($signalement, $request->user(), StatutSignalement::from($donnees['statut']), $donnees['reponse']);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Réponse envoyée : l’élève la verra à sa prochaine visite.']);

        return to_route('contenu.signalements.index');
    }

    /**
     * @return array<string, mixed>|null
     */
    private function questionVue(Question $question, ?int $numero): ?array
    {
        /** @var VersionContenu|null $version */
        $version = $question->versions()
            ->where('decision', DecisionRelecture::Publiee->value)
            ->when($numero, fn (Builder $q, int $n) => $q->where('numero', $n))
            ->first();

        return $version === null ? null : PresentationQuestion::depuisVersion($question, $version);
    }

    /**
     * @return array<string, mixed>
     */
    private function presenter(Signalement $signalement, ?Model $cible): array
    {
        return [
            'uuid' => $signalement->uuid,
            'cible' => $signalement->cible_type->value,
            'cible_libelle' => $signalement->cible_type->libelle(),
            'contenu' => $this->contenu($cible),
            'version' => $signalement->version,
            'motif' => $signalement->motif->value,
            'motif_libelle' => $signalement->motif->libelle(),
            'message' => $signalement->message,
            'statut' => $signalement->statut->value,
            'statut_libelle' => $signalement->statut->libelle(),
            'reponse' => $signalement->reponse,
            'eleve' => $signalement->eleve->pseudo,
            'traite_par' => $signalement->traitePar?->pseudo,
            'traite_le' => $signalement->traite_le?->toIso8601String(),
            'saisi_le' => $signalement->saisi_le->toIso8601String(),
        ];
    }

    /**
     * @return array{titre: string, matiere: array{nom: string, teinte: string}|null, lien: string|null}|null
     */
    private function contenu(?Model $cible): ?array
    {
        return match (true) {
            $cible instanceof Question => [
                'titre' => $cible->extrait !== '' ? $cible->extrait : 'Question sans texte',
                'matiere' => ['nom' => $cible->notion->chapitre->matiere->nom, 'teinte' => $cible->notion->chapitre->matiere->teinte->value],
                'lien' => route('contenu.questions.show', $cible),
            ],
            $cible instanceof Lecon => [
                'titre' => $cible->titre,
                'matiere' => ['nom' => $cible->notion->chapitre->matiere->nom, 'teinte' => $cible->notion->chapitre->matiere->teinte->value],
                'lien' => route('contenu.lecons.show', $cible),
            ],
            $cible instanceof Sujet => [
                'titre' => $cible->titre,
                'matiere' => ['nom' => $cible->matiere->nom, 'teinte' => $cible->matiere->teinte->value],
                'lien' => route('contenu.annales.show', $cible),
            ],
            default => null,
        };
    }
}
