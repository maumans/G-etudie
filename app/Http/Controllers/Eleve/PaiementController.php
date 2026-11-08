<?php

namespace App\Http\Controllers\Eleve;

use App\Enums\FormuleAbonnement;
use App\Enums\MoyenPaiement;
use App\Enums\StatutPaiement;
use App\Http\Controllers\Controller;
use App\Models\Paiement;
use App\Services\AbonnementService;
use App\Services\Paiements\PaiementRefuse;
use App\Services\PaiementService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Un paiement par mobile money côté élève (lot 9) : le lancer, puis suivre
 * son état jusqu'à la réponse de l'opérateur (l'écran se relit toutes les
 * trois secondes tant que le paiement attend). Un élève ne voit que ses
 * paiements (404 sinon).
 */
class PaiementController extends Controller
{
    public function __construct(private PaiementService $paiements) {}

    public function store(Request $request): RedirectResponse
    {
        $donnees = $request->validate([
            'formule' => ['required', Rule::enum(FormuleAbonnement::class)],
            'moyen' => ['required', Rule::enum(MoyenPaiement::class)],
            'numero' => ['required', 'string', 'max:25'],
        ], [], ['numero' => 'numéro du payeur', 'moyen' => 'moyen de paiement']);

        try {
            $paiement = $this->paiements->initier(
                $request->user(),
                FormuleAbonnement::from($donnees['formule']),
                MoyenPaiement::from($donnees['moyen']),
                $donnees['numero'],
            );
        } catch (PaiementRefuse $refus) {
            throw ValidationException::withMessages(['numero' => $refus->getMessage()]);
        }

        return to_route('eleve.paiements.show', $paiement);
    }

    public function show(Request $request, Paiement $paiement, AbonnementService $abonnements): Response
    {
        abort_unless($paiement->user_id === $request->user()->id, 404);

        return Inertia::render('eleve/paiement', [
            'paiement' => fn () => $this->presenter($paiement->refresh(), $abonnements, $request),
        ]);
    }

    /** @return array<string, mixed> */
    private function presenter(Paiement $paiement, AbonnementService $abonnements, Request $request): array
    {
        return [
            'uuid' => $paiement->uuid,
            'statut' => $paiement->statut->value,
            'formule' => $paiement->formule->pourEcran(),
            'moyen' => ['cle' => $paiement->moyen->value, 'libelle' => $paiement->moyen->libelle()],
            'consigne' => $paiement->moyen->consigne(),
            'montant_gnf' => $paiement->montant_gnf,
            'numero' => $paiement->numeroMasque(),
            'reference' => $paiement->reference_operateur,
            'motif' => $paiement->motif_echec,
            'initie_le' => $paiement->initie_le->toIso8601ZuluString(),
            'expire_le' => $paiement->expire_le->toIso8601ZuluString(),
            // La passerelle simulée donne l'adresse de son faux écran
            // d'opérateur ; un vrai opérateur sonne le téléphone du payeur.
            'url_paiement' => $paiement->statut === StatutPaiement::EnAttente ? $paiement->url_paiement : null,
            'simule' => $paiement->passerelle === 'simulee',
            'fin_abonnement' => $paiement->statut === StatutPaiement::Reussi
                ? $abonnements->finAbonnement($request->user())?->toIso8601ZuluString()
                : null,
        ];
    }
}
