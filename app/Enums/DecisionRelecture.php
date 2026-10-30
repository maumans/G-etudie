<?php

namespace App\Enums;

/** Issue d'une version envoyée en relecture. */
enum DecisionRelecture: string
{
    case Publiee = 'publiee';
    case Renvoyee = 'renvoyee';
    /** L'auteur l'a reprise avant toute décision. */
    case Retiree = 'retiree';

    public function libelle(): string
    {
        return match ($this) {
            self::Publiee => 'Publiée',
            self::Renvoyee => 'Renvoyée',
            self::Retiree => 'Reprise par l\'auteur',
        };
    }
}
