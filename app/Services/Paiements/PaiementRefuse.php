<?php

namespace App\Services\Paiements;

use RuntimeException;

/** Un paiement refusé avant d'être demandé (numéro non vérifié, numéro faux…), avec la phrase à montrer. */
class PaiementRefuse extends RuntimeException {}
