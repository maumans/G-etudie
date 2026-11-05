<?php

namespace App\Policies;

use App\Enums\Permission;
use App\Models\ExamenBlanc;
use App\Models\User;
use Illuminate\Auth\Access\Response;

/**
 * Un examen blanc n'est vu que par son élève ; sinon 404 (CLAUDE.md § 3 :
 * qu'il existe n'est pas une information à donner). Parents et enseignants
 * le verront par Perimetre au lot 11.
 */
class ExamenBlancPolicy
{
    public function voir(User $user, ExamenBlanc $examen): Response
    {
        return $user->can(Permission::EspaceEleve->value) && $examen->user_id === $user->id
            ? Response::allow()
            : Response::denyAsNotFound();
    }
}
