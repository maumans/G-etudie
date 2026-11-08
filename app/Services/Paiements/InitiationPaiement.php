<?php

namespace App\Services\Paiements;

/** La réponse de l'opérateur au lancement d'un paiement. */
final readonly class InitiationPaiement
{
    public function __construct(
        public string $reference,
        /** Adresse à suivre pour payer, si l'opérateur en donne une. */
        public ?string $url = null,
    ) {}
}
