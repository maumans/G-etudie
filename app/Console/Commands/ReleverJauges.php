<?php

namespace App\Console\Commands;

use App\Services\Plateforme\ReleveJaugeService;
use Carbon\CarbonImmutable;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

/**
 * Lot 13 (PLAN M18, « Impact ») : la jauge de chaque élève, relevée chaque
 * dimanche soir (routes/console.php). L'évolution de la jauge du rapport
 * d'impact se lit dans ces relevés ; ils ne commencent qu'au premier
 * passage (le passé ne se reconstitue pas). Relancer la même semaine
 * remplace la valeur.
 */
#[Signature('jauges:relever {--jour= : un jour de la semaine à relever (AAAA-MM-JJ), aujourd’hui par défaut}')]
#[Description('Relève la jauge de préparation de chaque élève pour la semaine')]
class ReleverJauges extends Command
{
    public function handle(ReleveJaugeService $releves): int
    {
        $jour = $this->option('jour');
        $instant = is_string($jour) && $jour !== '' ? CarbonImmutable::parse($jour) : CarbonImmutable::now();
        $nombre = $releves->relever($instant);

        $this->info("{$nombre} jauges relevées pour la semaine du ".ReleveJaugeService::semaine($instant)->toDateString().'.');

        return self::SUCCESS;
    }
}
