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

    /** Lot 12 : le fil du groupe (élève présent ou enseignant du groupe). */
    public function participer(User $user, Groupe $groupe): Response
    {
        return Perimetre::peutParticiperAuFil($user, $groupe) ? Response::allow() : Response::denyAsNotFound();
    }

    /** Lot 12 : modérer le fil (l'enseignant du groupe). */
    public function moderer(User $user, Groupe $groupe): Response
    {
        return Perimetre::peutModererFil($user, $groupe) ? Response::allow() : Response::denyAsNotFound();
    }
}
