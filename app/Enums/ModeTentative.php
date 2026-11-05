<?php

namespace App\Enums;

/** Où la réponse a été donnée (PLAN § 6, `tentatives.mode`). */
enum ModeTentative: string
{
    case Seance = 'seance';
    case Entrainement = 'entrainement';

    /** Lot 5 : une réponse d'examen blanc, envoyée avec l'examen. */
    case ExamenBlanc = 'examen_blanc';
}
