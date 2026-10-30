<?php

namespace App\Enums;

/** Les trois examens nationaux (noms exacts, CLAUDE.md § 5). */
enum CodeExamen: string
{
    case Cee = 'CEE';
    case Bepc = 'BEPC';
    case Bac = 'BAC';

    public function nom(): string
    {
        return match ($this) {
            self::Cee => "Certificat d'études élémentaires",
            self::Bepc => "Brevet d'études du premier cycle",
            self::Bac => 'Baccalauréat unique',
        };
    }

    /** Seul le Bac a des séries (SM, SE, SS). */
    public function aDesSeries(): bool
    {
        return $this === self::Bac;
    }
}
