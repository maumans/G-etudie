<?php

namespace App\Console\Commands;

use App\Services\CodeAccesService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

/**
 * Lot 9 : les codes en clair d'un lot jamais remis ne restent pas
 * indéfiniment en base (config `paiements.codes.jours_avant_effacement`).
 */
#[Signature('codes:effacer-oublies')]
#[Description('Efface les codes prépayés en clair des lots jamais remis')]
class EffacerCodesOublies extends Command
{
    public function handle(CodeAccesService $codes): int
    {
        $this->line('Lots effacés : '.$codes->effacerCodesOublies());

        return self::SUCCESS;
    }
}
