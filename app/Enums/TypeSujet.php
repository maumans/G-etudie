<?php

namespace App\Enums;

/** D'où vient un sujet (PLAN § 6, `sujets.type`). */
enum TypeSujet: string
{
    /** Sujet tombé à l'examen : une annale. */
    case Officiel = 'officiel';

    /** Sujet écrit par l'équipe pédagogique, sur le modèle de l'examen. */
    case BlancMaison = 'blanc_maison';

    public function libelle(): string
    {
        return match ($this) {
            self::Officiel => 'Sujet officiel',
            self::BlancMaison => 'Sujet maison',
        };
    }
}
