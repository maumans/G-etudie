<?php

namespace App\Enums;

/** D'où vient une période d'abonnement. */
enum SourceAbonnement: string
{
    case Paiement = 'paiement';
    case Code = 'code';
    /** Lot 11 : une place de la licence d'un établissement, attribuée par son gestionnaire. */
    case Licence = 'licence';

    public function libelle(): string
    {
        return match ($this) {
            self::Paiement => 'Mobile money',
            self::Code => 'Code prépayé',
            self::Licence => "Licence de l'établissement",
        };
    }
}
