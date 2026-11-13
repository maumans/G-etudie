<?php

namespace App\Http\Controllers\Console;

use App\Enums\StatutReponseTuteur;
use App\Http\Controllers\Controller;
use App\Models\MessageTuteur;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Console › Tuteur (lot 10, PLAN M11 : « coût suivi dans la console » ;
 * § 14 : « coût de l'IA — quotas, cache, modèle adapté, suivi dans la
 * console »). Ce que le tuteur sert et ce qu'il coûte, sur 30 jours : les
 * coûts sont gardés en micro-dollars (prix de config/tuteur.php), lus aussi
 * en GNF au taux indicatif de `tuteur.gnf_par_dollar`.
 *
 * Aucun élève n'y est nommé. Permission `tuteur.couts`.
 */
class TuteurController extends Controller
{
    private const JOURS = 30;

    public function index(Request $request): Response
    {
        $aujourdhui = CarbonImmutable::now()->startOfDay();
        $depuis = $aujourdhui->subDays(self::JOURS - 1);
        $reponses = fn () => MessageTuteur::query()->where('role', MessageTuteur::TUTEUR)->where('created_at', '>=', $depuis);

        $parJour = $reponses()->toBase()
            ->selectRaw('date(created_at) as jour')
            ->selectRaw('sum(case when statut = ? then 1 else 0 end) as explications', [StatutReponseTuteur::Complete->value])
            ->selectRaw('sum(case when depuis_cache then 1 else 0 end) as cache')
            ->selectRaw('sum(cout_micro_usd) as cout')
            ->groupBy('jour')
            ->orderBy('jour')
            ->get()
            ->keyBy(fn (object $ligne) => (string) $ligne->jour);

        $jours = collect(range(0, self::JOURS - 1))->map(function (int $decalage) use ($depuis, $parJour) {
            $jour = $depuis->addDays($decalage)->toDateString();
            $ligne = $parJour->get($jour);

            return [
                'jour' => $jour,
                'explications' => (int) ($ligne->explications ?? 0),
                'cache' => (int) ($ligne->cache ?? 0),
                'cout_micro_usd' => (int) ($ligne->cout ?? 0),
            ];
        })->values();

        $completes = $reponses()->where('statut', StatutReponseTuteur::Complete->value);
        $explications = (clone $completes)->count();
        $cout = (int) $reponses()->sum('cout_micro_usd');
        $appels = (clone $completes)->where('depuis_cache', false);
        $premiersMots = (clone $appels)->whereNotNull('premier_mot_ms')->orderBy('premier_mot_ms')->pluck('premier_mot_ms');

        return Inertia::render('console/tuteur', [
            'jours' => self::JOURS,
            'bilan' => [
                'aujourdhui' => MessageTuteur::query()->where('role', MessageTuteur::TUTEUR)->where('statut', StatutReponseTuteur::Complete->value)->where('created_at', '>=', $aujourdhui)->count(),
                'explications' => $explications,
                'part_cache' => $explications === 0 ? 0 : (int) round(100 * (clone $completes)->where('depuis_cache', true)->count() / $explications),
                'cout_micro_usd' => $cout,
                'cout_moyen_micro_usd' => ($n = (clone $appels)->count()) === 0 ? 0 : intdiv($cout, $n),
                'premier_mot_median_ms' => $premiersMots->isEmpty() ? null : (int) $premiersMots[intdiv($premiersMots->count(), 2)],
                'premier_mot_p90_ms' => $premiersMots->isEmpty() ? null : (int) $premiersMots[min($premiersMots->count() - 1, (int) floor($premiersMots->count() * 0.9))],
                'recentrages' => $reponses()->whereIn('statut', [StatutReponseTuteur::HorsSujet->value, StatutReponseTuteur::Refus->value])->count(),
                'pannes' => $reponses()->where('statut', StatutReponseTuteur::Erreur->value)->count(),
                'eleves' => $reponses()->distinct()->count('user_id'),
            ],
            'par_jour' => $jours,
            'par_modele' => $reponses()->toBase()
                ->whereNotNull('modele')
                ->where('depuis_cache', false)
                ->selectRaw('modele, count(*) as reponses, sum(jetons_entree) as entree, sum(jetons_sortie) as sortie, sum(jetons_cache_lus) as cache_lus, sum(cout_micro_usd) as cout')
                ->groupBy('modele')
                ->orderByDesc('cout')
                ->orderBy('modele')
                ->get()
                ->map(fn (object $l) => [
                    'modele' => (string) $l->modele,
                    'reponses' => (int) $l->reponses,
                    'jetons_entree' => (int) $l->entree,
                    'jetons_sortie' => (int) $l->sortie,
                    'jetons_cache_lus' => (int) $l->cache_lus,
                    'cout_micro_usd' => (int) $l->cout,
                ])->values(),
            'reglages' => [
                'modele' => (string) config('tuteur.modele'),
                'moteur' => (string) config('tuteur.moteur'),
                'quota_gratuit' => (int) config('tuteur.quota_gratuit'),
                'quota_abonne' => (int) config('tuteur.quota_abonne'),
                'gnf_par_dollar' => (int) config('tuteur.gnf_par_dollar'),
            ],
            'est_exemple' => $reponses()->where('est_exemple', true)->exists(),
        ]);
    }
}
