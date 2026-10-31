<?php

namespace App\Enums;

/** Où la réponse a été donnée (PLAN § 6, `tentatives.mode`). */
enum ModeTentative: string
{
    case Seance = 'seance';
    case Entrainement = 'entrainement';
}
