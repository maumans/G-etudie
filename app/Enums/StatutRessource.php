<?php

namespace App\Enums;

/** Le circuit d'une ressource externe (lot 12) : proposée → vérifiée → retirée. */
enum StatutRessource: string
{
    case Proposee = 'proposee';
    case Verifiee = 'verifiee';
    case Retiree = 'retiree';

    public function libelle(): string
    {
        return match ($this) {
            self::Proposee => 'À vérifier',
            self::Verifiee => 'Vérifiée',
            self::Retiree => 'Retirée',
        };
    }
}
