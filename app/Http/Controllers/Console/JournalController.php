<?php

namespace App\Http\Controllers\Console;

use App\Http\Controllers\Controller;
use App\Models\EntreeJournalAcces;
use App\Support\JournalAcces;
use App\Support\RechercheTexte;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Console › Journal des accès (PLAN M18, CLAUDE.md § 9) : ce qui a touché un
 * compte, un paiement, un code, un lien parent ou un établissement, sur
 * toute la plateforme — sans portée par établissement (on trace justement
 * ce qui traverse les périmètres). L'adresse IP et l'appareil s'y lisent ;
 * jamais de mot de passe, de code ni de numéro complet (JournalAcces).
 * Permission `console.journal`.
 */
class JournalController extends Controller
{
    public function index(Request $request): Response
    {
        $donnees = $request->validate([
            'action' => ['nullable', 'string', Rule::in(array_keys(JournalAcces::LIBELLES))],
            'recherche' => ['nullable', 'string', 'max:80'],
            'du' => ['nullable', 'date_format:Y-m-d'],
            'au' => ['nullable', 'date_format:Y-m-d'],
        ]);
        $filtres = [
            'action' => $donnees['action'] ?? null,
            'recherche' => trim($donnees['recherche'] ?? ''),
            'du' => $donnees['du'] ?? null,
            'au' => $donnees['au'] ?? null,
        ];

        $requete = EntreeJournalAcces::query()->with('auteur:id,prenom,pseudo')
            ->when($filtres['action'], fn (Builder $q, string $action) => $q->where('action', $action))
            ->when($filtres['du'], fn (Builder $q, string $du) => $q->where('cree_le', '>=', CarbonImmutable::parse($du)->startOfDay()))
            ->when($filtres['au'], fn (Builder $q, string $au) => $q->where('cree_le', '<=', CarbonImmutable::parse($au)->endOfDay()));
        RechercheTexte::appliquer($requete, $filtres['recherche'], ['auteur.prenom', 'auteur.pseudo', 'ip']);

        $page = $requete->orderByDesc('cree_le')->orderByDesc('id')->paginate(30)->withQueryString();
        $aujourdhui = CarbonImmutable::now()->startOfDay();

        return Inertia::render('console/journal', [
            'filtres' => $filtres,
            'actions' => collect(JournalAcces::LIBELLES)
                ->map(fn (string $libelle, string $cle) => ['cle' => $cle, 'libelle' => $libelle])
                ->sortBy('libelle')
                ->values(),
            'bilan' => [
                'aujourdhui' => EntreeJournalAcces::query()->where('cree_le', '>=', $aujourdhui)->count(),
                'semaine' => EntreeJournalAcces::query()->where('cree_le', '>=', $aujourdhui->subDays(6))->count(),
                'comptes' => EntreeJournalAcces::query()->where('cree_le', '>=', $aujourdhui->subDays(6))->whereNotNull('auteur_id')->distinct()->count('auteur_id'),
            ],
            'entrees' => [
                'donnees' => collect($page->items())->map(fn (EntreeJournalAcces $e) => [
                    'id' => $e->id,
                    'action' => $e->action,
                    'libelle' => JournalAcces::libelle($e->action),
                    'famille' => JournalAcces::famille($e->action),
                    'auteur' => $e->auteur === null ? null : $e->auteur->prenom.' · '.$e->auteur->pseudo,
                    'cible' => $e->cible_type === null ? null : $e->cible_type.' n° '.$e->cible_id,
                    'ip' => $e->ip,
                    'appareil' => self::appareil($e->agent),
                    'le' => $e->cree_le->toIso8601ZuluString(),
                ])->values(),
                'page' => $page->currentPage(),
                'derniere' => $page->lastPage(),
                'total' => $page->total(),
            ],
        ]);
    }

    /** « Android · Chrome » plutôt que la chaîne d'agent entière. */
    public static function appareil(?string $agent): ?string
    {
        if ($agent === null || $agent === '') {
            return null;
        }

        $systeme = match (true) {
            str_contains($agent, 'Android') => 'Android',
            str_contains($agent, 'iPhone'), str_contains($agent, 'iPad') => 'iOS',
            str_contains($agent, 'Windows') => 'Windows',
            str_contains($agent, 'Mac OS') => 'macOS',
            str_contains($agent, 'Linux') => 'Linux',
            default => null,
        };
        $navigateur = match (true) {
            str_contains($agent, 'Edg/') => 'Edge',
            str_contains($agent, 'OPR/'), str_contains($agent, 'Opera') => 'Opera',
            str_contains($agent, 'Firefox/') => 'Firefox',
            str_contains($agent, 'Chrome/') => 'Chrome',
            str_contains($agent, 'Safari/') => 'Safari',
            default => null,
        };
        $libelle = implode(' · ', array_filter([$systeme, $navigateur]));

        return $libelle === '' ? 'Autre' : $libelle;
    }
}
