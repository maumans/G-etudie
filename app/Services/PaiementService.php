<?php

namespace App\Services;

use App\Enums\FormuleAbonnement;
use App\Enums\MoyenPaiement;
use App\Enums\SourceAbonnement;
use App\Enums\StatutPaiement;
use App\Models\NotificationPaiement;
use App\Models\Paiement;
use App\Models\User;
use App\Services\Paiements\NotificationInvalide;
use App\Services\Paiements\PaiementRefuse;
use App\Services\Paiements\PasserelleIndisponible;
use App\Services\Paiements\Passerelles;
use App\Support\Telephone;
use Carbon\CarbonImmutable;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Les paiements par mobile money (PLAN M16) — seule autorité : lancer un
 * paiement, traiter le webhook de l'opérateur, rattraper un webhook perdu.
 *
 * Règles :
 *  - le **montant** vient de la formule (config), jamais du téléphone ;
 *  - un numéro **vérifié** est exigé avant de payer (D3) ; le payeur, lui,
 *    peut être un autre (un parent) : son numéro est chiffré en base ;
 *  - un webhook n'est cru qu'avec une **signature** juste, et n'est traité
 *    **qu'une fois** (unicité de son identifiant) ; un paiement déjà conclu
 *    ne change plus ; un montant différent de celui demandé est refusé ;
 *  - un paiement réussi ouvre **un** abonnement (AbonnementService, colonne
 *    `abonnements.paiement_id` unique), dans la même transaction.
 */
class PaiementService
{
    public function __construct(
        private Passerelles $passerelles,
        private AbonnementService $abonnements,
    ) {}

    /** @throws PaiementRefuse */
    public function initier(User $eleve, FormuleAbonnement $formule, MoyenPaiement $moyen, string $numeroSaisi): Paiement
    {
        if (! $eleve->telephoneVerifie()) {
            throw new PaiementRefuse('Vérifie d\'abord ton numéro : c\'est lui qui protège ton abonnement.');
        }

        $numero = Telephone::normaliser($numeroSaisi) ?? throw new PaiementRefuse('Ce numéro ne ressemble pas à un numéro guinéen (6xx xx xx xx).');

        if (! $this->passerelles->ouvertes()) {
            throw new PaiementRefuse('Le paiement mobile n\'est pas encore ouvert. Tu peux utiliser un code prépayé.');
        }

        $passerelle = $this->passerelles->courante();
        $maintenant = CarbonImmutable::now();

        $paiement = Paiement::create([
            'uuid' => (string) Str::uuid7(),
            'user_id' => $eleve->id,
            'formule' => $formule->value,
            'montant_gnf' => $formule->prixGnf(),
            'moyen' => $moyen->value,
            'passerelle' => $passerelle->nom(),
            'numero_payeur' => $numero,
            'numero_fin' => substr($numero, -2),
            'statut' => StatutPaiement::EnAttente->value,
            'initie_le' => $maintenant,
            'expire_le' => $maintenant->addMinutes((int) config('paiements.delai_minutes')),
        ]);

        try {
            $initiation = $passerelle->initier($paiement, $numero);
        } catch (PasserelleIndisponible $e) {
            $paiement->update([
                'statut' => StatutPaiement::Echoue->value,
                'motif_echec' => 'Le service de paiement n\'a pas répondu.',
                'conclu_le' => CarbonImmutable::now(),
            ]);

            throw new PaiementRefuse('Le service de paiement ne répond pas. Réessaie dans quelques minutes.', previous: $e);
        }

        $paiement->update([
            'reference_operateur' => $initiation->reference,
            'url_paiement' => $initiation->url,
        ]);

        return $paiement;
    }

    /**
     * Traite un webhook. Renvoie ce qui s'est passé (gardé avec la
     * notification) : le contrôleur répond 200 dans tous les cas sauf une
     * signature fausse, pour que l'opérateur cesse de renvoyer.
     *
     * @throws NotificationInvalide
     */
    public function traiterNotification(string $nomPasserelle, Request $requete): string
    {
        $passerelle = $this->passerelles->pour($nomPasserelle) ?? throw new NotificationInvalide('Passerelle inconnue.');
        $lue = $passerelle->lireNotification($requete);

        return DB::transaction(function () use ($nomPasserelle, $requete, $lue) {
            try {
                // Une seule ligne par événement : la seconde copie d'un
                // webhook, même arrivée en même temps, s'arrête ici.
                $notification = NotificationPaiement::create([
                    'passerelle' => $nomPasserelle,
                    'identifiant_evenement' => $lue->identifiant,
                    'charge' => json_decode($requete->getContent(), true),
                    'recu_le' => CarbonImmutable::now(),
                ]);
            } catch (UniqueConstraintViolationException) {
                return 'deja_recue';
            }

            $paiement = Paiement::query()
                ->where('passerelle', $nomPasserelle)
                ->where('reference_operateur', $lue->reference)
                ->lockForUpdate()
                ->first();

            $resultat = match (true) {
                $paiement === null => 'paiement_inconnu',
                $paiement->statut->estConclu() => 'deja_conclu',
                $lue->statut === StatutPaiement::Reussi && $lue->montantGnf !== $paiement->montant_gnf => $this->conclure($paiement, StatutPaiement::Echoue, 'Le montant reçu ne correspond pas à la formule.', 'montant_different'),
                default => $this->conclure($paiement, $lue->statut, $lue->motif),
            };

            $notification->update([
                'paiement_id' => $paiement?->id,
                'resultat' => $resultat,
                'traite_le' => CarbonImmutable::now(),
            ]);

            if ($resultat === 'paiement_inconnu' || $resultat === 'montant_different') {
                Log::warning("Webhook de paiement : {$resultat}", ['passerelle' => $nomPasserelle, 'reference' => $lue->reference]);
            }

            return $resultat;
        });
    }

    /**
     * Les paiements restés en attente : on demande à l'opérateur (webhook
     * perdu) ; au-delà du délai, sans réponse, le paiement expire. Lancé par
     * le planificateur toutes les cinq minutes (`paiements:verifier`).
     *
     * @return array{reussis: int, echoues: int, expires: int}
     */
    public function verifierEnAttente(): array
    {
        $bilan = ['reussis' => 0, 'echoues' => 0, 'expires' => 0];

        Paiement::query()
            ->where('statut', StatutPaiement::EnAttente->value)
            ->where('initie_le', '<', CarbonImmutable::now()->subMinutes(2))
            ->orderBy('id')
            ->each(function (Paiement $paiement) use (&$bilan) {
                $statut = $this->passerelles->pour($paiement->passerelle)?->consulter($paiement);

                if ($statut === null && $paiement->expire_le->isFuture()) {
                    return;
                }

                DB::transaction(function () use ($paiement, $statut, &$bilan) {
                    $verrouille = Paiement::query()->whereKey($paiement->id)->lockForUpdate()->first();

                    if ($verrouille === null || $verrouille->statut->estConclu()) {
                        return;
                    }

                    $final = $statut ?? StatutPaiement::Expire;
                    $this->conclure($verrouille, $final, $final === StatutPaiement::Expire ? 'Pas de confirmation de l\'opérateur à temps.' : null);
                    $bilan[match ($final) {
                        StatutPaiement::Reussi => 'reussis',
                        StatutPaiement::Echoue => 'echoues',
                        default => 'expires',
                    }]++;
                });
            });

        return $bilan;
    }

    /** Pose l'état final ; réussi : l'abonnement s'ouvre dans la même transaction. */
    private function conclure(Paiement $paiement, StatutPaiement $statut, ?string $motif = null, ?string $resultat = null): string
    {
        $paiement->update([
            'statut' => $statut->value,
            'motif_echec' => $statut === StatutPaiement::Reussi ? null : ($motif ?? 'Paiement refusé.'),
            'conclu_le' => CarbonImmutable::now(),
        ]);

        if ($statut === StatutPaiement::Reussi) {
            $this->abonnements->activer($paiement->user, $paiement->formule, SourceAbonnement::Paiement, paiementId: $paiement->id);
        }

        return $resultat ?? $statut->value;
    }
}
