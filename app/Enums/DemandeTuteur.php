<?php

namespace App\Enums;

/**
 * Ce que l'élève demande au tuteur. Les quatre premières sont des boutons
 * (même texte pour tous : la première explication d'un objet se met en
 * cache) ; `Question` est une phrase tapée par l'élève (jamais en cache).
 */
enum DemandeTuteur: string
{
    case Expliquer = 'expliquer';
    case Etape = 'etape';
    case PlusSimple = 'plus_simple';
    case Exemple = 'exemple';
    case Question = 'question';

    /** Ce que l'élève voit de sa demande dans la conversation. */
    public function libelle(): string
    {
        return match ($this) {
            self::Expliquer => 'Explique-moi cette question.',
            self::Etape => 'Je ne comprends pas cette étape.',
            self::PlusSimple => 'Encore plus simple, s’il te plaît.',
            self::Exemple => 'Donne-moi un autre exemple.',
            self::Question => 'Ma question',
        };
    }

    /** La première demande d'une conversation ancrée : la seule mise en cache. */
    public function ouvre(): bool
    {
        return $this === self::Expliquer || $this === self::Etape;
    }
}
