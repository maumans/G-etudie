<?php

namespace App\Jobs;

use App\Models\ImportSujet;
use App\Services\Annales\ImportSujetService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/**
 * Lecture d'un document d'import en file (PLAN § 8 : les imports ne tournent
 * pas en `sync`). Une seule tentative : chaque lecture coûte, et un échec est
 * noté sur l'import, que le rédacteur relance lui-même.
 */
class TraiterImportSujet implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    // Un sujet entier avec ses corrigés : plusieurs minutes de lecture.
    public int $timeout = 900;

    public function __construct(public ImportSujet $import) {}

    public function handle(ImportSujetService $imports): void
    {
        $imports->traiter($this->import);
    }
}
