<?php

namespace App\Support;

/**
 * Le seul format des montants côté serveur : « 100 000 GNF » — espace
 * insécable entre les milliers et avant « GNF », virgule décimale, deux
 * décimales au plus (zéros finaux retirés).
 *
 * Équivalent exact de formaterGnf() (resources/js/lib/utils.ts) : les deux
 * sont testés sur le même jeu d'exemples, tests/fixtures/gnf.json.
 */
class Gnf
{
    public const ESPACE_INSECABLE = "\u{00A0}";

    public static function formater(int|float $montant): string
    {
        return self::formaterNombre($montant).self::ESPACE_INSECABLE.'GNF';
    }

    public static function formaterNombre(int|float $valeur): string
    {
        $arrondi = number_format(abs($valeur), 2, '.', '');
        [$entier, $decimales] = explode('.', $arrondi);
        $negatif = $valeur < 0 && (float) $arrondi !== 0.0;
        $groupes = (string) preg_replace('/\B(?=(\d{3})+(?!\d))/', self::ESPACE_INSECABLE, $entier);
        $reste = rtrim($decimales, '0');

        return ($negatif ? '-' : '').$groupes.($reste !== '' ? ','.$reste : '');
    }
}
