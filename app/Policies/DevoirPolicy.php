<?php

namespace App\Policies;

use App\Models\Devoir;
use App\Models\User;
use App\Support\Perimetre;
use Illuminate\Auth\Access\Response;

/**
 * Un devoir suit son groupe (404 hors périmètre) : l'enseignant le suit et
 * le modifie ; un élève présent dans le groupe le fait.
 */
class DevoirPolicy
{
    public function voir(User $user, Devoir $devoir): Response
    {
        return Perimetre::peutConsulterGroupe($user, $devoir->groupe) ? Response::allow() : Response::denyAsNotFound();
    }

    public function gerer(User $user, Devoir $devoir): Response
    {
        return Perimetre::peutGererGroupe($user, $devoir->groupe) ? Response::allow() : Response::denyAsNotFound();
    }

    public function faire(User $user, Devoir $devoir): Response
    {
        return Perimetre::estMembre($user, $devoir->groupe) ? Response::allow() : Response::denyAsNotFound();
    }
}
