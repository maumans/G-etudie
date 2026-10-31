<?php

namespace App\Enums;

/** Ce que l'élève dit d'une leçon (PLAN M4 : « compris / à revoir »). */
enum EtatLecon: string
{
    case Comprise = 'comprise';
    case ARevoir = 'a_revoir';
}
