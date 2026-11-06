<?php

namespace App\Support\Abonnements;

use App\Models\User;
use Carbon\CarbonImmutable;

/**
 * D'où vient l'abonnement d'un élève. Les abonnements arrivent au lot 9
 * (PLAN M16) ; d'ici là, `AucunAbonnement`. DroitsPacks ne lit que cette
 * interface : le lot 9 n'aura qu'à fournir la sienne.
 */
interface SourceAbonnements
{
    /** Fin de l'abonnement en cours, ou `null` si l'élève n'est pas abonné. */
    public function finAbonnement(User $eleve): ?CarbonImmutable;
}
