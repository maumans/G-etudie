<?php

namespace App\Policies;

use App\Models\Groupe;
use App\Models\User;
use App\Support\Perimetre;
use Illuminate\Auth\Access\Response;

/**
 * Un groupe hors périmètre répond 404 (CLAUDE.md § 3). Consulter :
 * Perimetre::groupesConsultables ; agir (devoirs, membres, archiver) :
 * l'enseignant du groupe seulement.
 */
class GroupePolicy
{
    public function voir(User $user, Groupe $groupe): Response
    {
        return Perimetre::peutConsulterGroupe($user, $groupe) ? Response::allow() : Response::denyAsNotFound();
    }

    public function gerer(User $user, Groupe $groupe): Response
    {
        return Perimetre::peutGererGroupe($user, $groupe) ? Response::allow() : Response::denyAsNotFound();
    }
}
