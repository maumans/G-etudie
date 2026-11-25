<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Support\Str;

/**
 * Un compte ouvert par quelqu'un d'autre que son titulaire (un établissement
 * pour ses enseignants, l'administrateur en ligne de commande) : un mot de
 * passe provisoire montré une seule fois, et un pseudo libre tiré du prénom.
 * Seule règle, utilisée par EtablissementService et ComptesService.
 */
class CompteProvisoire
{
    /** Lisible au téléphone et dicté à voix haute : sans 0/O, ni 1/l/I. */
    private const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

    public const LONGUEUR = 10;

    public static function motDePasse(): string
    {
        $mot = '';

        for ($i = 0; $i < self::LONGUEUR; $i++) {
            $mot .= self::ALPHABET[random_int(0, strlen(self::ALPHABET) - 1)];
        }

        return $mot;
    }

    /** « aissatou_4821 » : la base du prénom et un nombre, jamais déjà pris. */
    public static function pseudoLibre(string $prenom): string
    {
        $base = Str::of($prenom)->ascii()->lower()->replaceMatches('/[^a-z0-9]/', '')->limit(14, '')->value() ?: 'membre';

        do {
            $pseudo = $base.'_'.random_int(100, 9999);
        } while (User::query()->where('pseudo', $pseudo)->exists());

        return $pseudo;
    }
}
