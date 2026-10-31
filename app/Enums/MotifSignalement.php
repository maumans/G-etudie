<?php

namespace App\Enums;

/**
 * Pourquoi l'élève signale (« Signaler une erreur », PLAN M5). Les libellés
 * sont ceux que lit l'élève, au tutoiement ; le back-office les reprend.
 */
enum MotifSignalement: string
{
    case Enonce = 'enonce';
    case Corrige = 'corrige';
    case ReponseRefusee = 'reponse_refusee';
    case Incomprehensible = 'incomprehensible';
    case Autre = 'autre';

    public function libelle(): string
    {
        return match ($this) {
            self::Enonce => 'L’énoncé contient une erreur',
            self::Corrige => 'Le corrigé est faux',
            self::ReponseRefusee => 'Ma réponse juste est comptée fausse',
            self::Incomprehensible => 'Je ne comprends pas l’explication',
            self::Autre => 'Autre chose',
        };
    }
}
