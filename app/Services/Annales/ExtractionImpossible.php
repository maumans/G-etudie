<?php

namespace App\Services\Annales;

use RuntimeException;

/**
 * L'extracteur n'a rien pu tirer du document. Le message est montré au
 * rédacteur sur l'import en échec (« Relancer » reste possible).
 */
class ExtractionImpossible extends RuntimeException {}
