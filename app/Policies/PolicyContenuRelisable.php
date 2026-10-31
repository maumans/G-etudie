<?php

namespace App\Policies;

use App\Enums\Permission;
use App\Enums\StatutContenu;
use App\Models\Contracts\ContenuRelisable;
use App\Models\User;
use App\Support\Perimetre;
use Illuminate\Auth\Access\Response;

/**
 * Qui fait quoi sur un contenu du circuit de relecture (leçon, question).
 * Les rattachements viennent de App\Support\Perimetre ; ContenuService
 * revérifie sous verrou.
 *
 * Tout le personnel du back-office consulte tout le catalogue : un contenu
 * qu'on voit mais qu'on ne peut pas toucher répond 403, avec la raison. Un
 * compte hors du back-office reçoit 404 (il n'a pas à savoir qu'il existe).
 */
abstract class PolicyContenuRelisable
{
    public function view(User $user, ContenuRelisable $contenu): Response
    {
        return $user->can(Permission::EspaceContenu->value)
            ? Response::allow()
            : Response::denyAsNotFound();
    }

    public function rediger(User $user, ContenuRelisable $contenu): Response
    {
        if (! $user->can(Permission::EspaceContenu->value)) {
            return Response::denyAsNotFound();
        }

        return Perimetre::peutRediger($user, $contenu)
            ? Response::allow()
            : Response::deny("Seul son auteur, ou le responsable pédagogique, modifie cette {$contenu->nomContenu()}.");
    }

    public function relire(User $user, ContenuRelisable $contenu): Response
    {
        if (! $user->can(Permission::EspaceContenu->value)) {
            return Response::denyAsNotFound();
        }

        $nom = $contenu->nomContenu();

        if ($contenu->statutDuContenu() !== StatutContenu::EnRelecture) {
            return Response::deny("Cette {$nom} n'attend pas de relecture.");
        }

        if (Perimetre::estAuteurDe($user, $contenu)) {
            return Response::deny("Vous avez écrit cette {$nom} : un autre relecteur doit la relire.");
        }

        return Perimetre::peutRelire($user, $contenu)
            ? Response::allow()
            : Response::deny("Vous ne pouvez pas relire de {$nom}.");
    }

    public function archiver(User $user, ContenuRelisable $contenu): Response
    {
        if (! $user->can(Permission::EspaceContenu->value)) {
            return Response::denyAsNotFound();
        }

        return $user->can(Permission::AdministrerContenu->value)
            ? Response::allow()
            : Response::deny("Seul le responsable pédagogique archive une {$contenu->nomContenu()}.");
    }
}
