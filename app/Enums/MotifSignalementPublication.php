<?php

namespace App\Enums;

/** Pourquoi un élève signale une publication du fil de son groupe (lot 12, PLAN M13). */
enum MotifSignalementPublication: string
{
    case Moquerie = 'moquerie';
    case Inadapte = 'inadapte';
    case HorsSujet = 'hors_sujet';
    case Personnel = 'personnel';

    public function libelle(): string
    {
        return match ($this) {
            self::Moquerie => 'Moquerie ou méchanceté',
            self::Inadapte => 'Contenu choquant ou grossier',
            self::HorsSujet => 'Rien à voir avec les cours',
            self::Personnel => 'Donne des informations personnelles',
        };
    }
}
