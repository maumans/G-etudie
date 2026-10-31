<?php

namespace App\Policies;

use App\Enums\Permission;
use App\Models\Signalement;
use App\Models\User;
use Illuminate\Auth\Access\Response;

/**
 * Un signalement se lit et se traite au back-office avec la permission
 * `signalements.traiter` ; sinon 404 (CLAUDE.md § 3). L'élève voit les siens
 * dans « Mes signalements », par une requête bornée à son compte.
 */
class SignalementPolicy
{
    public function traiter(User $user, Signalement $signalement): Response
    {
        return $user->can(Permission::TraiterSignalements->value)
            ? Response::allow()
            : Response::denyAsNotFound();
    }
}
