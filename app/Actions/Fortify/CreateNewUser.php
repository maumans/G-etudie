<?php

namespace App\Actions\Fortify;

use App\Enums\Role;
use App\Models\User;
use App\Support\JournalAcces;
use App\Support\ReglesCompte;
use Illuminate\Support\Facades\Validator;
use Laravel\Fortify\Contracts\CreatesNewUsers;

/**
 * Inscription (D3) : prénom, pseudo, téléphone, mot de passe — rien d'autre
 * (PLAN § 10). Le numéro n'est pas encore vérifié : la vérification par code
 * SMS est proposée juste après, sans bloquer (l'élève commence tout de suite).
 */
class CreateNewUser implements CreatesNewUsers
{
    /**
     * @param  array<string, string>  $input
     */
    public function create(array $input): User
    {
        $donnees = Validator::make(ReglesCompte::normaliserTelephone($input), [
            'prenom' => ReglesCompte::prenom(),
            'pseudo' => ReglesCompte::pseudo(),
            'telephone' => ReglesCompte::telephone(),
            'password' => ReglesCompte::motDePasse(),
        ])->validate();

        // L'inscription ouvre un compte élève, et seulement élève : les autres
        // rôles sont donnés par un administrateur.
        $user = User::create($donnees);
        $user->assignRole(Role::Eleve);

        JournalAcces::consigner('compte.cree', $user, auteur: $user);

        return $user;
    }
}
