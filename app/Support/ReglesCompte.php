<?php

namespace App\Support;

use App\Models\User;
use App\Rules\TelephoneGuineen;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

/**
 * Règles de validation d'un compte, une seule fois pour l'inscription et
 * « Mon compte » (une règle = une autorité).
 *
 * Le téléphone est vérifié sur sa forme normalisée : la requête doit d'abord
 * passer par `normaliserTelephone()`.
 */
class ReglesCompte
{
    /** @return array<int, ValidationRule|string> */
    public static function prenom(): array
    {
        return ['required', 'string', 'max:60'];
    }

    /**
     * Pseudo : visible par les autres élèves à la place du nom (D7).
     *
     * @return array<int, mixed>
     */
    public static function pseudo(?User $ignorer = null): array
    {
        return [
            'required',
            'string',
            'min:3',
            'max:20',
            'regex:/^[\pL\pN_.-]+$/u',
            Rule::unique(User::class, 'pseudo')->ignore($ignorer),
        ];
    }

    /** @return array<int, mixed> */
    public static function telephone(?User $ignorer = null): array
    {
        return [
            'required',
            'string',
            new TelephoneGuineen,
            Rule::unique(User::class, 'telephone')->ignore($ignorer),
        ];
    }

    /** @return array<int, mixed> */
    public static function motDePasse(): array
    {
        return ['required', 'string', Password::defaults()];
    }

    /**
     * Remplace le téléphone saisi par sa forme normalisée (« +224… »), pour
     * que l'unicité et l'enregistrement portent sur la même valeur.
     *
     * @param  array<string, mixed>  $donnees
     * @return array<string, mixed>
     */
    public static function normaliserTelephone(array $donnees, string $champ = 'telephone'): array
    {
        if (isset($donnees[$champ]) && is_string($donnees[$champ])) {
            $donnees[$champ] = Telephone::normaliser($donnees[$champ]) ?? $donnees[$champ];
        }

        return $donnees;
    }
}
