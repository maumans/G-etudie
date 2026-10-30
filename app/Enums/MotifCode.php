<?php

namespace App\Enums;

/** Pourquoi un code SMS a été envoyé (D3). */
enum MotifCode: string
{
    case Verification = 'verification';
    case Recuperation = 'recuperation';
    case ChangementNumero = 'changement_numero';
}
