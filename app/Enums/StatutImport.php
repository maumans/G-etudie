<?php

namespace App\Enums;

/**
 * Un import assisté (PLAN M17) : en file, en lecture par l'IA, sujet créé en
 * brouillon (`pret`), ou échec avec sa raison (on peut relancer).
 */
enum StatutImport: string
{
    case EnAttente = 'en_attente';
    case EnCours = 'en_cours';
    case Pret = 'pret';
    case Echec = 'echec';

    public function libelle(): string
    {
        return match ($this) {
            self::EnAttente => 'En file',
            self::EnCours => 'Lecture en cours',
            self::Pret => 'Sujet créé',
            self::Echec => 'Échec',
        };
    }

    public function estTermine(): bool
    {
        return $this === self::Pret || $this === self::Echec;
    }
}
