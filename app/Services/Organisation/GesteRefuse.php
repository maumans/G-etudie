<?php

namespace App\Services\Organisation;

use RuntimeException;

/**
 * Un geste du lot 11 refusé pour une raison à dire à la personne (code
 * expiré, groupe d'un autre examen, plus de place sur la licence…). Le
 * contrôleur la change en erreur de formulaire, sur le champ `$champ`.
 */
class GesteRefuse extends RuntimeException
{
    public function __construct(string $message, public readonly string $champ = 'code')
    {
        parent::__construct($message);
    }
}
