<?php

namespace App\Enums;

/** Séries du Baccalauréat unique. */
enum CodeSerie: string
{
    case Sm = 'SM';
    case Se = 'SE';
    case Ss = 'SS';

    public function nom(): string
    {
        return match ($this) {
            self::Sm => 'Sciences mathématiques',
            self::Se => 'Sciences expérimentales',
            self::Ss => 'Sciences sociales',
        };
    }
}
