<?php

namespace App\Enums;

/**
 * D'où part une conversation avec le tuteur (lot 10, PLAN M11) : une
 * question de notre contenu, une étape de son corrigé, ou une question libre
 * posée dans une matière de l'élève.
 */
enum ObjetTuteur: string
{
    case Question = 'question';
    case Etape = 'etape';
    case Libre = 'libre';
}
