<?php

namespace App\Support;

/**
 * Le format des codes prépayés : 12 caractères, lus par groupes de 4
 * (« K7RD-2MXQ-9HPB »), dans un alphabet sans les signes qui se
 * confondent à l'œil ou à l'impression (0/O, 1/I). Le 12ᵉ caractère est une
 * **clé de contrôle** : une faute de frappe se voit sur l'appareil, avant
 * tout envoi. Jumeau : resources/js/lib/code-acces.ts, testés sur le même jeu
 * d'exemples (tests/fixtures/codes-acces.json).
 *
 * L'empreinte est un HMAC SHA-256 avec la clé des codes
 * (`paiements.codes.cle`, sinon APP_KEY) : la base ne permet pas de
 * retrouver un code.
 */
final class CodeAcces
{
    public const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    public const LONGUEUR = 12;

    public static function generer(): string
    {
        $corps = '';

        for ($i = 0; $i < self::LONGUEUR - 1; $i++) {
            $corps .= self::ALPHABET[random_int(0, strlen(self::ALPHABET) - 1)];
        }

        return $corps.self::cle($corps);
    }

    /** La clé de contrôle des 11 premiers caractères : somme pondérée par des poids impairs (premiers avec 32), modulo 32. Toute faute sur un seul caractère change la clé. */
    public static function cle(string $corps): string
    {
        $somme = 0;

        foreach (str_split($corps) as $rang => $caractere) {
            $somme += (2 * $rang + 1) * (int) strpos(self::ALPHABET, $caractere);
        }

        return self::ALPHABET[$somme % strlen(self::ALPHABET)];
    }

    /** « k7rd 2mxq-9hpb » → « K7RD2MXQ9HPB », ou `null` si le code est mal tapé. */
    public static function normaliser(string $saisie): ?string
    {
        $code = strtoupper((string) preg_replace('/[\s\-–.]/u', '', $saisie));

        if (strlen($code) !== self::LONGUEUR || strspn($code, self::ALPHABET) !== self::LONGUEUR) {
            return null;
        }

        return self::cle(substr($code, 0, -1)) === substr($code, -1) ? $code : null;
    }

    /** « K7RD2MXQ9HPB » → « K7RD-2MXQ-9HPB ». */
    public static function afficher(string $code): string
    {
        return implode('-', str_split($code, 4));
    }

    public static function empreinte(string $code): string
    {
        $cle = config('paiements.codes.cle') ?: config('app.key');

        return hash_hmac('sha256', $code, (string) $cle);
    }
}
