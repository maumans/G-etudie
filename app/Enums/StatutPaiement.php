<?php

namespace App\Enums;

/**
 * Où en est un paiement. `en_attente` est le seul état qui change ; les
 * trois autres sont définitifs : un webhook qui arrive après ne change rien.
 */
enum StatutPaiement: string
{
    case EnAttente = 'en_attente';
    case Reussi = 'reussi';
    case Echoue = 'echoue';
    case Expire = 'expire';

    public function estConclu(): bool
    {
        return $this !== self::EnAttente;
    }

    public function libelle(): string
    {
        return match ($this) {
            self::EnAttente => 'En attente',
            self::Reussi => 'Payé',
            self::Echoue => 'Échoué',
            self::Expire => 'Expiré',
        };
    }
}
