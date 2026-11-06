<?php

namespace App\Console\Commands;

use App\Models\Pack;
use App\Services\PackService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

/**
 * Génère (ou met à jour) les packs de toutes les épreuves de l'année
 * (HORS_LIGNE.md A.5). À lancer au déploiement, après `migrate` et
 * `db:seed` ; ensuite, chaque publication regénère les packs de sa matière
 * en file (GenererPack), et la commande repasse chaque nuit.
 */
#[Signature('packs:generer')]
#[Description('Génère les packs hors ligne de toutes les épreuves de l\'année courante')]
class GenererPacks extends Command
{
    public function handle(PackService $packs): int
    {
        $packs->genererTout()->each(fn (Pack $pack) => $this->line(sprintf(
            '%s — version %s, %s octets, %d morceau(x)',
            $pack->cle,
            $pack->version,
            number_format($pack->taille_octets, 0, ',', ' '),
            $pack->morceaux,
        )));

        return self::SUCCESS;
    }
}
