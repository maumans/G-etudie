<?php

namespace App\Http\Controllers\Console;

use App\Enums\StatutPaiement;
use App\Http\Controllers\Controller;
use App\Models\Paiement;
use App\Support\RechercheTexte;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Console › Paiements (lot 9) : la liste pour l'assistance (« j'ai payé et
 * rien ne s'ouvre »). Recherche par référence de l'opérateur, prénom ou
 * pseudo ; jamais le numéro du payeur en clair. Les revenus détaillés
 * viennent au lot 13. Permission `paiements.voir`.
 */
class PaiementsController extends Controller
{
    public function index(Request $request): Response
    {
        $filtres = [
            'statut' => StatutPaiement::tryFrom($request->string('statut')->toString())?->value,
            'recherche' => $request->string('recherche')->trim()->toString(),
        ];

        $requete = Paiement::query()->with('user')
            ->when($filtres['statut'], fn (Builder $q, string $statut) => $q->where('statut', $statut));
        RechercheTexte::appliquer($requete, $filtres['recherche'], ['reference_operateur', 'user.prenom', 'user.pseudo']);

        $page = $requete->orderByDesc('initie_le')->orderByDesc('id')->paginate(25)->withQueryString();
        $depuis = now()->subDays(30);

        return Inertia::render('console/paiements', [
            'filtres' => $filtres,
            'statuts' => array_map(fn (StatutPaiement $s) => ['cle' => $s->value, 'libelle' => $s->libelle()], StatutPaiement::cases()),
            'bilan' => [
                'reussis' => Paiement::query()->where('statut', StatutPaiement::Reussi->value)->where('initie_le', '>=', $depuis)->count(),
                'montant_gnf' => (int) Paiement::query()->where('statut', StatutPaiement::Reussi->value)->where('initie_le', '>=', $depuis)->sum('montant_gnf'),
                'en_attente' => Paiement::query()->where('statut', StatutPaiement::EnAttente->value)->count(),
                'echoues' => Paiement::query()->whereIn('statut', [StatutPaiement::Echoue->value, StatutPaiement::Expire->value])->where('initie_le', '>=', $depuis)->count(),
            ],
            'paiements' => [
                'donnees' => collect($page->items())->map(fn (Paiement $p) => [
                    'uuid' => $p->uuid,
                    'eleve' => $p->user->prenom.' · '.$p->user->pseudo,
                    'formule' => $p->formule->nom(),
                    'moyen' => $p->moyen->libelle(),
                    'montant_gnf' => $p->montant_gnf,
                    'numero' => $p->numeroMasque(),
                    'reference' => $p->reference_operateur,
                    'statut' => $p->statut->value,
                    'libelle_statut' => $p->statut->libelle(),
                    'motif' => $p->motif_echec,
                    'initie_le' => $p->initie_le->toIso8601ZuluString(),
                ])->values(),
                'page' => $page->currentPage(),
                'derniere' => $page->lastPage(),
                'total' => $page->total(),
            ],
        ]);
    }
}
