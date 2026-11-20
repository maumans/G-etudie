<?php

namespace App\Console\Commands;

use App\Services\TerrainService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

/**
 * Lot 14 : les diagnostics et les erreurs des appareils ne restent pas plus
 * de 90 jours, les avis des élèves plus d'un an (données minimales,
 * CLAUDE.md § 9).
 */
#[Signature('terrain:purger')]
#[Description('Efface les diagnostics et erreurs des appareils de plus de 90 jours, et les avis de plus d\'un an')]
class PurgerTerrain extends Command
{
    public function handle(TerrainService $terrain): int
    {
        $effaces = $terrain->purger();
        $this->line("Diagnostics effacés : {$effaces['diagnostics']} ; erreurs : {$effaces['erreurs']} ; avis : {$effaces['avis']}");

        return self::SUCCESS;
    }
}
