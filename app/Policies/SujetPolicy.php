<?php

namespace App\Policies;

use App\Enums\Permission;
use App\Models\Sujet;
use App\Models\User;
use App\Support\CatalogueEleve;
use Illuminate\Auth\Access\Response;

/**
 * Qui fait quoi sur une annale : le circuit de relecture commun aux contenus
 * (PolicyContenuRelisable) ; s'y ajoutent la lecture par l'élève et son
 * document original.
 */
class SujetPolicy extends PolicyContenuRelisable
{
    /**
     * Lire une annale dans l'espace élève : publiée et dans son examen
     * (App\Support\CatalogueEleve), sinon 404.
     */
    public function lire(User $user, Sujet $sujet): Response
    {
        return $user->can(Permission::EspaceEleve->value) && CatalogueEleve::peutLireSujet($user, $sujet)
            ? Response::allow()
            : Response::denyAsNotFound();
    }

    /** Le document original : le personnel du back-office, ou l'élève qui lit l'annale. */
    public function document(User $user, Sujet $sujet): Response
    {
        if ($sujet->document_chemin === null) {
            return Response::denyAsNotFound();
        }

        return $user->can(Permission::EspaceContenu->value) ? Response::allow() : $this->lire($user, $sujet);
    }
}
