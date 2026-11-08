<?php

namespace App\Enums;

/** Comment un abonnement est payé (PLAN M16). Les codes prépayés ont leur circuit (CodeAccesService). */
enum MoyenPaiement: string
{
    case OrangeMoney = 'orange_money';
    case MtnMomo = 'mtn_momo';

    public function libelle(): string
    {
        return match ($this) {
            self::OrangeMoney => 'Orange Money',
            self::MtnMomo => 'MTN MoMo',
        };
    }

    /** Ce que le payeur fait sur son téléphone pour confirmer. */
    public function consigne(): string
    {
        return match ($this) {
            self::OrangeMoney => 'Confirme le paiement sur le téléphone du payeur : un message Orange Money demande le code secret.',
            self::MtnMomo => 'Confirme le paiement sur le téléphone du payeur : un message MoMo demande le code secret.',
        };
    }
}
