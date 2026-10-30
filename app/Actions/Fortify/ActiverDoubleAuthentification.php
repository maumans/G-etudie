<?php

namespace App\Actions\Fortify;

use App\Enums\Permission;
use Laravel\Fortify\Actions\EnableTwoFactorAuthentication;

/**
 * Les routes de Fortify (`/user/two-factor-authentication`…) ne portent pas
 * de `can:` : la garde est ici, au geste lui-même. La double authentification
 * n'est proposée qu'au personnel (DA4) ; un élève qui appellerait la route
 * directement reçoit 403.
 */
class ActiverDoubleAuthentification extends EnableTwoFactorAuthentication
{
    public function __invoke($user, $force = false)
    {
        abort_unless($user->can(Permission::DoubleAuthentification->value), 403);

        parent::__invoke($user, $force);
    }
}
