<?php

namespace App\Enums;

/**
 * Circuit d'un contenu (PLAN M17) : brouillon → en relecture → publié
 * (→ archivé). Une leçon publiée qu'on modifie repasse en brouillon, mais sa
 * version publiée reste en ligne jusqu'à la publication suivante.
 */
enum StatutContenu: string
{
    case Brouillon = 'brouillon';
    case EnRelecture = 'en_relecture';
    case Publie = 'publie';
    case Archive = 'archive';

    public function libelle(): string
    {
        return match ($this) {
            self::Brouillon => 'Brouillon',
            self::EnRelecture => 'En relecture',
            self::Publie => 'Publiée',
            self::Archive => 'Archivée',
        };
    }
}
