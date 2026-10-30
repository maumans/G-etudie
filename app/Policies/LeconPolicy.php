<?php

namespace App\Policies;

use App\Enums\Permission;
use App\Enums\StatutContenu;
use App\Models\Lecon;
use App\Models\User;
use App\Support\Perimetre;
use Illuminate\Auth\Access\Response;

/**
 * Qui fait quoi sur une leçon. Les rattachements viennent de
 * App\Support\Perimetre ; ContenuService revérifie sous verrou.
 *
 * Tout le personnel du back-office consulte tout le catalogue : une leçon
 * qu'on voit mais qu'on ne peut pas toucher répond 403, avec la raison. Un
 * compte hors du back-office reçoit 404 (il n'a pas à savoir qu'elle existe).
 */
class LeconPolicy
{
    public function view(User $user, Lecon $lecon): Response
    {
        return $user->can(Permission::EspaceContenu->value)
            ? Response::allow()
            : Response::denyAsNotFound();
    }

    public function rediger(User $user, Lecon $lecon): Response
    {
        if (! $user->can(Permission::EspaceContenu->value)) {
            return Response::denyAsNotFound();
        }

        return Perimetre::peutRedigerLecon($user, $lecon)
            ? Response::allow()
            : Response::deny('Seul son auteur, ou le responsable pédagogique, modifie cette leçon.');
    }

    public function relire(User $user, Lecon $lecon): Response
    {
        if (! $user->can(Permission::EspaceContenu->value)) {
            return Response::denyAsNotFound();
        }

        if ($lecon->statut !== StatutContenu::EnRelecture) {
            return Response::deny('Cette leçon n\'attend pas de relecture.');
        }

        if (Perimetre::estAuteurDe($user, $lecon)) {
            return Response::deny('Vous avez écrit cette leçon : un autre relecteur doit la relire.');
        }

        return Perimetre::peutRelireLecon($user, $lecon)
            ? Response::allow()
            : Response::deny('Vous ne pouvez pas relire de leçon.');
    }

    public function archiver(User $user, Lecon $lecon): Response
    {
        if (! $user->can(Permission::EspaceContenu->value)) {
            return Response::denyAsNotFound();
        }

        return $user->can(Permission::AdministrerContenu->value)
            ? Response::allow()
            : Response::deny('Seul le responsable pédagogique archive une leçon.');
    }
}
