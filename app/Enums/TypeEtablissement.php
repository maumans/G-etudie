<?php

namespace App\Enums;

/** Type d'un établissement (PLAN § 6). */
enum TypeEtablissement: string
{
    case Public = 'public';
    case Prive = 'prive';
    case FrancoArabe = 'franco_arabe';
}
