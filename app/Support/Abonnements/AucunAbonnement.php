<?php

namespace App\Support\Abonnements;

use App\Models\User;
use Carbon\CarbonImmutable;

/** Avant le lot 9 : personne n'est abonné. */
class AucunAbonnement implements SourceAbonnements
{
    public function finAbonnement(User $eleve): ?CarbonImmutable
    {
        return null;
    }
}
