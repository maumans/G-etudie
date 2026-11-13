<?php

namespace App\Services\Tuteur;

use RuntimeException;

/**
 * Une demande au tuteur refusée **avant** d'ouvrir le flux (quota du jour
 * atteint, corrigé réservé, explication déjà en cours, conversation finie).
 * Le message est celui que lit l'élève ; `raison` permet à l'écran de
 * proposer la bonne suite (l'abonnement, une nouvelle conversation…).
 */
class DemandeRefusee extends RuntimeException
{
    public function __construct(
        string $message,
        public readonly string $raison,
        public readonly int $statut = 422,
    ) {
        parent::__construct($message);
    }
}
