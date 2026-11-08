<?php

namespace App\Http\Controllers;

use App\Enums\StatutPaiement;
use App\Models\Paiement;
use App\Services\Paiements\PasserelleSimulee;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Le faux écran d'opérateur de la passerelle simulée (développement et
 * tests seulement, SeulementEnDeveloppement) : « Valider » ou « Refuser »
 * envoie, depuis le navigateur, le webhook signé à la vraie route
 * `/paiements/notifications/simulee` — le même chemin qu'un vrai opérateur.
 */
class PasserelleSimuleeController extends Controller
{
    public function __invoke(string $reference, PasserelleSimulee $passerelle): Response
    {
        $paiement = Paiement::query()
            ->where('passerelle', PasserelleSimulee::NOM)
            ->where('reference_operateur', $reference)
            ->firstOrFail();

        return Inertia::render('dev/passerelle', [
            'paiement' => [
                'uuid' => $paiement->uuid,
                'reference' => $reference,
                'montant_gnf' => $paiement->montant_gnf,
                'moyen' => $paiement->moyen->libelle(),
                'numero' => $paiement->numeroMasque(),
                'formule' => $paiement->formule->nom(),
                'en_attente' => $paiement->statut === StatutPaiement::EnAttente,
            ],
            'webhook' => route('paiements.notifications', PasserelleSimulee::NOM),
            'accepter' => $passerelle->notification($paiement, true, evenement: 'EVT-'.$reference.'-OK'),
            'refuser' => $passerelle->notification($paiement, false, evenement: 'EVT-'.$reference.'-KO'),
            'retour' => route('eleve.paiements.show', $paiement),
        ]);
    }
}
