<?php

namespace App\Jobs;

use App\Models\Pack;
use App\Services\PackService;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/**
 * Regénère un pack après une publication, un retrait ou une correction
 * (HORS_LIGNE.md A.5). Unique tant qu'il attend : dix leçons publiées d'un
 * coup ne font qu'une génération.
 */
class GenererPack implements ShouldBeUnique, ShouldQueue
{
    use Queueable;

    /** Une génération à la fois par pack, et le regroupement des demandes proches. */
    public int $uniqueFor = 600;

    public function __construct(public int $packId) {}

    public function uniqueId(): string
    {
        return (string) $this->packId;
    }

    public function handle(PackService $packs): void
    {
        $pack = Pack::find($this->packId);

        if ($pack !== null) {
            $packs->generer($pack);
        }
    }
}
