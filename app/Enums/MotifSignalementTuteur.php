<?php

namespace App\Enums;

/**
 * « Signaler cette réponse » sous une explication du tuteur. Les réponses
 * signalées passent en tête du journal du back-office.
 */
enum MotifSignalementTuteur: string
{
    case Fausse = 'fausse';
    case PasClaire = 'pas_claire';
    case Inadaptee = 'inadaptee';

    public function libelle(): string
    {
        return match ($this) {
            self::Fausse => 'L’explication contient une erreur',
            self::PasClaire => 'Je ne comprends toujours pas',
            self::Inadaptee => 'La réponse est déplacée',
        };
    }
}
