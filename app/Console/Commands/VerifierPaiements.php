<?php

namespace App\Console\Commands;

use App\Services\PaiementService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

/**
 * Lot 9 : les paiements restés en attente (webhook perdu, payeur qui n'a
 * jamais confirmé). Toutes les cinq minutes par le planificateur.
 */
#[Signature('paiements:verifier')]
#[Description('Redemande à l\'opérateur les paiements en attente, et fait expirer ceux qui ont dépassé le délai')]
class VerifierPaiements extends Command
{
    public function handle(PaiementService $paiements): int
    {
        $bilan = $paiements->verifierEnAttente();
        $this->line("Réussis : {$bilan['reussis']} · échoués : {$bilan['echoues']} · expirés : {$bilan['expires']}");

        return self::SUCCESS;
    }
}
