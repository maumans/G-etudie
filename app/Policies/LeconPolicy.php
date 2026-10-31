<?php

namespace App\Policies;

use App\Enums\Permission;
use App\Models\Lecon;
use App\Models\User;
use App\Support\CatalogueEleve;
use Illuminate\Auth\Access\Response;

/**
 * Qui fait quoi sur une leçon : le circuit de relecture est commun aux
 * contenus (PolicyContenuRelisable) ; s'y ajoute la lecture par l'élève.
 */
class LeconPolicy extends PolicyContenuRelisable
{
    /**
     * Lire une leçon dans l'espace élève : publiée et dans son examen
     * (App\Support\CatalogueEleve), sinon 404.
     */
    public function lire(User $user, Lecon $lecon): Response
    {
        return $user->can(Permission::EspaceEleve->value) && CatalogueEleve::peutLireLecon($user, $lecon)
            ? Response::allow()
            : Response::denyAsNotFound();
    }
}
