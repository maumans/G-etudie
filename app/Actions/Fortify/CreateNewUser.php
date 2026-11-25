<?php

namespace App\Actions\Fortify;

use App\Enums\Role;
use App\Models\User;
use App\Support\JournalAcces;
use App\Support\ReglesCompte;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Laravel\Fortify\Contracts\CreatesNewUsers;

/**
 * Inscription (D3) : prénom, pseudo, téléphone, mot de passe — rien d'autre
 * (PLAN § 10). Le numéro n'est pas encore vérifié : la vérification par code
 * SMS est proposée juste après, sans bloquer (l'élève commence tout de suite).
 *
 * Deux profils seulement (2026-11-25) : **élève** (par défaut) ou
 * **parent** — un parent ouvre son compte seul, puis suit son enfant avec le
 * code que l'enfant lui donne (lot 11, décision 1). Les autres rôles sont
 * donnés par un administrateur (`compte:creer`) ou un établissement.
 */
class CreateNewUser implements CreatesNewUsers
{
    /** Le profil choisi à l'inscription => le rôle donné. */
    public const PROFILS = [
        'eleve' => Role::Eleve,
        'parent' => Role::Parent,
    ];

    /**
     * @param  array<string, string>  $input
     */
    public function create(array $input): User
    {
        $donnees = Validator::make(ReglesCompte::normaliserTelephone($input), [
            'profil' => ['nullable', 'string', Rule::in(array_keys(self::PROFILS))],
            'prenom' => ReglesCompte::prenom(),
            'pseudo' => ReglesCompte::pseudo(),
            'telephone' => ReglesCompte::telephone(),
            'password' => ReglesCompte::motDePasse(),
        ], [], ['profil' => 'le profil'])->validate();

        $profil = $donnees['profil'] ?? 'eleve';
        unset($donnees['profil']);

        $user = User::create($donnees);
        $user->assignRole(self::PROFILS[$profil]);

        JournalAcces::consigner('compte.cree', $user, ['profil' => $profil], $user);

        return $user;
    }
}
