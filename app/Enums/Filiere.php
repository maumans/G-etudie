<?php

namespace App\Enums;

/** Filière d'une épreuve (D2 : franco-arabe prévue dans le modèle, contenu en V2). */
enum Filiere: string
{
    case Generale = 'generale';
    case FrancoArabe = 'franco_arabe';

    public function libelle(): string
    {
        return match ($this) {
            self::Generale => 'Générale',
            self::FrancoArabe => 'Franco-arabe',
        };
    }
}
