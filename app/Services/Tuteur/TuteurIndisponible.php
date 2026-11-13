<?php

namespace App\Services\Tuteur;

use RuntimeException;

/**
 * Le tuteur ne peut pas répondre maintenant (clé absente, API injoignable,
 * trop de demandes). Le message est celui que lit l'élève.
 */
class TuteurIndisponible extends RuntimeException {}
