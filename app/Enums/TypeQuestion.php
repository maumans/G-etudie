<?php

namespace App\Enums;

/**
 * Types de question (PLAN M5). Le lot 2 n'a que le QCM à une réponse, pour
 * le premier exercice ; les autres types arrivent au lot 3.
 */
enum TypeQuestion: string
{
    case QcmUne = 'qcm_une';
}
