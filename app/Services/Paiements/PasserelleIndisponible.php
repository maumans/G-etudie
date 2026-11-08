<?php

namespace App\Services\Paiements;

use RuntimeException;

/** L'opérateur ne répond pas, ou la passerelle n'est pas ouverte ici. */
class PasserelleIndisponible extends RuntimeException {}
