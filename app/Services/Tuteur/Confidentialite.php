<?php

namespace App\Services\Tuteur;

/**
 * Rien de personnel ne part vers l'API (CLAUDE.md § 9, PLAN § 10) : ce que
 * l'élève tape passe par ici avant d'être envoyé **et** gardé. Un numéro de
 * téléphone ou une adresse e-mail devient « [retiré] ».
 */
final class Confidentialite
{
    public const RETIRE = '[retiré]';

    public static function nettoyer(string $texte): string
    {
        // Adresses e-mail.
        $texte = (string) preg_replace('/[\p{L}0-9._%+-]+@[\p{L}0-9.-]+\.[\p{L}]{2,}/u', self::RETIRE, $texte);

        // Numéros : 8 chiffres ou plus, espaces, points, tirets ou « + »
        // permis entre eux (+224 620 00 00 00, 620.00.00.00…). Un calcul
        // (« 3 + 4 = 7 ») ne contient jamais huit chiffres d'affilée.
        return (string) preg_replace('/\+?\d(?:[\s.\-]?\d){7,}/u', self::RETIRE, $texte);
    }
}
