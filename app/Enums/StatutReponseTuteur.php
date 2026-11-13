<?php

namespace App\Enums;

/**
 * Comment s'est terminée une réponse du tuteur. Seule `Complete` compte dans
 * le quota du jour : un refus, une demande hors sujet ou une panne ne
 * coûtent rien à l'élève.
 */
enum StatutReponseTuteur: string
{
    case Complete = 'complete';
    case HorsSujet = 'hors_sujet';
    case Refus = 'refus';
    case Interrompue = 'interrompue';
    case Erreur = 'erreur';

    public function libelle(): string
    {
        return match ($this) {
            self::Complete => 'Explication',
            self::HorsSujet => 'Hors sujet, recentré',
            self::Refus => 'Refusée',
            self::Interrompue => 'Interrompue',
            self::Erreur => 'Panne',
        };
    }
}
