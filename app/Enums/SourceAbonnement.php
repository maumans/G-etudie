<?php

namespace App\Enums;

/** D'où vient une période d'abonnement. */
enum SourceAbonnement: string
{
    case Paiement = 'paiement';
    case Code = 'code';

    public function libelle(): string
    {
        return match ($this) {
            self::Paiement => 'Mobile money',
            self::Code => 'Code prépayé',
        };
    }
}
