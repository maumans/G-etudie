<?php

namespace App\Console\Commands;

use App\Models\RessourceExterne;
use App\Services\RessourceService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Http\Client\Factory as ClientHttp;

/**
 * Lot 12 (PLAN M19) : contrôle des liens externes vérifiés, chaque semaine
 * (routes/console.php). Un lien qui ne répond plus sort de la vue élève et
 * apparaît « Lien cassé » au back-office ; le relecteur le corrige ou le
 * retire. Les plus anciennement contrôlés passent d'abord.
 */
#[Signature('ressources:verifier')]
#[Description('Contrôle que les liens des ressources externes vérifiées répondent encore')]
class VerifierRessources extends Command
{
    public function handle(RessourceService $ressources, ClientHttp $http): int
    {
        $aControler = RessourceExterne::query()
            ->verifiees()
            ->where('est_exemple', false)
            ->orderByRaw('controle_le is not null')
            ->orderBy('controle_le')
            ->orderBy('id')
            ->limit((int) config('ressources.controle.par_passage', 200))
            ->get();

        $casses = 0;

        foreach ($aControler as $ressource) {
            if (! $ressources->controler($ressource, $http)) {
                $casses++;
            }
        }

        $this->info("{$aControler->count()} liens contrôlés, {$casses} sans réponse.");

        return self::SUCCESS;
    }
}
