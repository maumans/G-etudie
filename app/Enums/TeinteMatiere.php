<?php

namespace App\Enums;

/**
 * Les teintes de matière du design system (DESIGN.md § 2.4). Chacune a sa
 * couleur et son icône dans `resources/js/lib/matieres.ts` (`MATIERES`), dont
 * les classes sont écrites en entier : une nouvelle teinte se crée dans le
 * code (ici, dans `MATIERES` et dans `app.css`), jamais depuis le back-office.
 * Un test vérifie que les deux listes sont identiques.
 */
enum TeinteMatiere: string
{
    case Maths = 'maths';
    case Physique = 'physique';
    case Chimie = 'chimie';
    case Biologie = 'biologie';
    case Francais = 'francais';
    case Anglais = 'anglais';
    case Histoire = 'histoire';
    case Philosophie = 'philosophie';
    case Economie = 'economie';
    case Culture = 'culture';
}
