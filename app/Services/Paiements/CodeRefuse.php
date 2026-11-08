<?php

namespace App\Services\Paiements;

use RuntimeException;

/** Un code prépayé refusé (mal tapé, inconnu, déjà utilisé, lot désactivé), avec la phrase à montrer. */
class CodeRefuse extends RuntimeException {}
