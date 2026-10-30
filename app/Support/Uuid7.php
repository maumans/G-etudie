<?php

namespace App\Support;

/**
 * Identifiants créés sur l'appareil : UUID v7 seulement (CLAUDE.md § 3,
 * HORS_LIGNE.md A.3.5). L'ordre des v7 est l'ordre des gestes ; un v4 n'a pas
 * d'ordre et est refusé. Jumeau : resources/js/lib/hors-ligne/uuid7.ts.
 */
final class Uuid7
{
    private const MOTIF = '/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/';

    public static function estValide(string $valeur): bool
    {
        return preg_match(self::MOTIF, $valeur) === 1;
    }
}
