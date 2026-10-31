<?php

namespace App\Enums;

/**
 * Types de question (PLAN M5). Le format de chacun et sa correction vivent
 * dans App\Support\FormatQuestion (et son jumeau `lib/contenu/questions.ts`).
 * Le type est choisi à la création et ne change plus : une tentative est
 * toujours corrigée selon le type de la question qu'elle a vue.
 */
enum TypeQuestion: string
{
    case QcmUne = 'qcm_une';
    case QcmPlusieurs = 'qcm_plusieurs';
    case VraiFaux = 'vrai_faux';
    case Numerique = 'numerique';
    case Courte = 'courte';
    case Trous = 'trous';
    case Appariement = 'appariement';
    case Ordre = 'ordre';
    case Ouverte = 'ouverte';

    public function libelle(): string
    {
        return match ($this) {
            self::QcmUne => 'QCM, une réponse',
            self::QcmPlusieurs => 'QCM, plusieurs réponses',
            self::VraiFaux => 'Vrai ou faux',
            self::Numerique => 'Réponse numérique',
            self::Courte => 'Réponse courte',
            self::Trous => 'Texte à trous',
            self::Appariement => 'Appariement',
            self::Ordre => 'Remise en ordre',
            self::Ouverte => 'Question ouverte',
        };
    }

    /** L'élève corrige lui-même sa rédaction, au barème (`tentative.auto_evaluer`). */
    public function estAutoEvaluee(): bool
    {
        return $this === self::Ouverte;
    }
}
