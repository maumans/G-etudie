<?php

namespace App\Services\HorsLigne;

use RuntimeException;

/**
 * Refus métier définitif d'une opération. Le message est montré à l'élève
 * dans « À corriger » : une phrase qu'il comprend, au tutoiement.
 *
 * Toute autre exception est une `erreur` : jamais mémorisée, l'opération sera
 * renvoyée.
 */
class OperationRejetee extends RuntimeException {}
