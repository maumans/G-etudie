<?php

namespace App\Services\HorsLigne\Operations;

use App\Enums\Permission;
use App\Models\Seance;
use App\Services\HorsLigne\ContexteOperation;
use App\Services\HorsLigne\GestionnaireOperation;
use App\Services\HorsLigne\OperationRejetee;
use App\Services\SeanceService;

/** `seance.terminer` (HORS_LIGNE.md A.6, priorité 2) : SeanceService::terminer. */
class TerminerSeance implements GestionnaireOperation
{
    public const TYPE = 'seance.terminer';

    public function __construct(private SeanceService $seances) {}

    public function permission(): string
    {
        return Permission::EspaceEleve->value;
    }

    public function regles(): array
    {
        return ['seance' => ['required', 'uuid']];
    }

    public function executer(ContexteOperation $contexte, array $charge): array
    {
        $seance = Seance::query()->where('uuid', $charge['seance'])->first()
            ?? throw new OperationRejetee('Cette séance n\'existe plus.');

        $seance = $this->seances->terminer($contexte->auteur, $seance, $contexte->saisiLe);

        return ['termine_le' => $seance->termine_le?->toIso8601ZuluString('millisecond')];
    }
}
