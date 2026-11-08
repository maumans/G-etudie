<?php

namespace App\Services\Paiements;

use App\Enums\StatutPaiement;

/** Un webhook lu et vérifié. */
final readonly class NotificationLue
{
    public function __construct(
        public string $identifiant,
        public string $reference,
        /** Reussi ou Echoue. */
        public StatutPaiement $statut,
        public int $montantGnf,
        public ?string $motif = null,
    ) {}
}
