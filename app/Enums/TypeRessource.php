<?php

namespace App\Enums;

/**
 * Ce qu'est une ressource externe (lot 12, PLAN M19). Le poids par défaut
 * sert quand le rédacteur ne l'a pas estimé : l'élève est toujours prévenu
 * de ce que le lien va lui coûter en données.
 */
enum TypeRessource: string
{
    case Video = 'video';
    case Article = 'article';
    case Encyclopedie = 'encyclopedie';
    case Exercices = 'exercices';

    public function libelle(): string
    {
        return match ($this) {
            self::Video => 'Vidéo',
            self::Article => 'Article',
            self::Encyclopedie => 'Encyclopédie',
            self::Exercices => 'Exercices en ligne',
        };
    }

    /** Estimation quand le poids n'est pas saisi (Ko). Une vidéo : ~ 8 Mo par 5 min en 360p. */
    public function poidsParDefautKo(?int $minutes): int
    {
        return match ($this) {
            self::Video => max(1, $minutes ?? 5) * 1600,
            self::Article, self::Encyclopedie => 900,
            self::Exercices => 1500,
        };
    }
}
