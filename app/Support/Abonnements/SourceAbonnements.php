<?php

namespace App\Support\Abonnements;

use App\Models\User;
use Carbon\CarbonImmutable;

/**
 * D'où vient l'abonnement d'un élève (PLAN M16) : AbonnementService depuis
 * le lot 9. DroitsPacks et DroitsAbonne ne lisent que cette interface.
 */
interface SourceAbonnements
{
    /** Fin de l'abonnement en cours, ou `null` si l'élève n'est pas abonné. */
    public function finAbonnement(User $eleve): ?CarbonImmutable;
}
