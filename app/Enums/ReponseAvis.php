<?php

namespace App\Enums;

/**
 * « Ton avis » (lot 14) : la réponse à « Ça t'a aidé ? ». Libellés lus par
 * l'élève, au tutoiement ; la console les reprend.
 */
enum ReponseAvis: string
{
    case Oui = 'oui';
    case UnPeu = 'un_peu';
    case Non = 'non';

    public function libelle(): string
    {
        return match ($this) {
            self::Oui => 'Oui',
            self::UnPeu => 'Un peu',
            self::Non => 'Non',
        };
    }
}
