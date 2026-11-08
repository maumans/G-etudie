<?php

namespace App\Services\Paiements;

use App\Enums\StatutPaiement;
use App\Models\Paiement;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Un faux opérateur, pour développer et tester le paiement de bout en bout
 * sans compte marchand (lot 9). Il fait tout ce que fera un vrai : une
 * référence, une page où le payeur « confirme » (`/dev/passerelle/{ref}`,
 * développement seulement), puis un **webhook signé** (HMAC SHA-256 du corps,
 * en-tête `X-Signature`) envoyé à la vraie route
 * `/paiements/notifications/simulee`.
 *
 * **Refusée en production** : un paiement simulé ne doit jamais ouvrir un
 * vrai abonnement.
 */
class PasserelleSimulee implements PasserellePaiement
{
    public const NOM = 'simulee';

    public const ENTETE_SIGNATURE = 'X-Signature';

    public function nom(): string
    {
        return self::NOM;
    }

    public static function estOuverte(): bool
    {
        return ! app()->isProduction();
    }

    public function initier(Paiement $paiement, string $numero): InitiationPaiement
    {
        if (! self::estOuverte()) {
            throw new PasserelleIndisponible('Le paiement mobile n\'est pas encore ouvert.');
        }

        $reference = 'SIM-'.Str::upper(Str::random(14));

        return new InitiationPaiement($reference, route('dev.passerelle.show', $reference));
    }

    /**
     * Le webhook que l'opérateur enverrait : le corps exact et sa signature.
     *
     * @return array{corps: string, signature: string}
     */
    public function notification(Paiement $paiement, bool $accepte, ?int $montant = null, ?string $evenement = null): array
    {
        $corps = json_encode([
            'evenement' => $evenement ?? 'EVT-'.Str::upper(Str::random(16)),
            'reference' => $paiement->reference_operateur,
            'statut' => $accepte ? 'SUCCESS' : 'FAILED',
            'montant' => $montant ?? $paiement->montant_gnf,
            'devise' => 'GNF',
            'motif' => $accepte ? null : 'Paiement refusé par le payeur.',
        ], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);

        return ['corps' => $corps, 'signature' => $this->signer($corps)];
    }

    public function signer(string $corps): string
    {
        return hash_hmac('sha256', $corps, (string) config('paiements.passerelles.simulee.secret'));
    }

    public function lireNotification(Request $requete): NotificationLue
    {
        $corps = $requete->getContent();
        $signature = (string) $requete->header(self::ENTETE_SIGNATURE, '');

        if ($corps === '' || $signature === '' || ! hash_equals($this->signer($corps), $signature)) {
            throw new NotificationInvalide('Signature absente ou fausse.');
        }

        $charge = json_decode($corps, true);

        if (! is_array($charge)
            || ! is_string($charge['evenement'] ?? null)
            || ! is_string($charge['reference'] ?? null)
            || ! in_array($charge['statut'] ?? null, ['SUCCESS', 'FAILED'], true)
            || ! is_int($charge['montant'] ?? null)
            || ($charge['devise'] ?? null) !== 'GNF') {
            throw new NotificationInvalide('Charge illisible.');
        }

        return new NotificationLue(
            identifiant: $charge['evenement'],
            reference: $charge['reference'],
            statut: $charge['statut'] === 'SUCCESS' ? StatutPaiement::Reussi : StatutPaiement::Echoue,
            montantGnf: $charge['montant'],
            motif: is_string($charge['motif'] ?? null) ? $charge['motif'] : null,
        );
    }

    /** Le faux opérateur ne garde rien : seul son webhook dit ce qui s'est passé. */
    public function consulter(Paiement $paiement): ?StatutPaiement
    {
        return null;
    }
}
