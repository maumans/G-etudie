<?php

namespace App\Enums;

/**
 * « Ton avis » (lot 14) : ce qui a gêné l'élève, en un toucher. Une erreur
 * dans un contenu n'est pas une étiquette : elle passe par « Signaler une
 * erreur » (PLAN M17), qui va à l'équipe pédagogique. Les libellés vivent
 * aussi dans resources/js/lib/terrain/avis.ts (mêmes clés).
 */
enum EtiquetteAvis: string
{
    case Lent = 'lent';
    case Donnees = 'donnees';
    case PasCompris = 'pas_compris';
    case Difficile = 'difficile';
    case Facile = 'facile';
    case Bug = 'bug';

    public function libelle(): string
    {
        return match ($this) {
            self::Lent => 'C’est lent',
            self::Donnees => 'Ça consomme trop de données',
            self::PasCompris => 'Je ne sais pas quoi faire',
            self::Difficile => 'Trop difficile',
            self::Facile => 'Trop facile',
            self::Bug => 'Quelque chose ne marche pas',
        };
    }
}
