<?php

namespace App\Enums;

/** Un signalement : ouvert, puis traité (corrigé) ou rejeté, avec une réponse. */
enum StatutSignalement: string
{
    case Ouvert = 'ouvert';
    case Traite = 'traite';
    case Rejete = 'rejete';

    public function libelle(): string
    {
        return match ($this) {
            self::Ouvert => 'Ouvert',
            self::Traite => 'Corrigé',
            self::Rejete => 'Sans suite',
        };
    }
}
