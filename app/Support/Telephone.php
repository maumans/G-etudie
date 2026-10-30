<?php

namespace App\Support;

/**
 * Numéros mobiles guinéens : indicatif +224, puis 9 chiffres commençant par
 * 6. Jumeau de resources/js/lib/telephone.ts : les deux sont testés sur le
 * même jeu d'exemples (tests/fixtures/telephones.json).
 */
class Telephone
{
    public const INDICATIF = '+224';

    /** « 622 12 34 56 », « 00224 622… », « +224622… » → « +224622123456 », ou null. */
    public static function normaliser(?string $saisie): ?string
    {
        $chiffres = self::chiffres((string) $saisie);

        return preg_match('/^6\d{8}$/', $chiffres) === 1 ? self::INDICATIF.$chiffres : null;
    }

    /** Garde les chiffres et retire l'indicatif (00224, 224) s'il est présent. */
    public static function chiffres(string $saisie): string
    {
        $chiffres = (string) preg_replace('/\D/', '', $saisie);

        if (str_starts_with($chiffres, '00224')) {
            return substr($chiffres, 5);
        }

        if (str_starts_with($chiffres, '224') && strlen($chiffres) > 9) {
            return substr($chiffres, 3);
        }

        return $chiffres;
    }

    /**
     * Numéro masqué pour l'affichage (« code envoyé au 6•• •• •4 56 ») : on
     * montre à qui le code est parti sans exposer le numéro entier.
     */
    public static function masquer(string $normalise): string
    {
        $chiffres = self::chiffres($normalise);

        return substr($chiffres, 0, 1).'•• •• •'.substr($chiffres, 6, 1).' '.substr($chiffres, 7, 2);
    }
}
