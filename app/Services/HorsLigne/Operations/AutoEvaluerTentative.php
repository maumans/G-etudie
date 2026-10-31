<?php

namespace App\Services\HorsLigne\Operations;

use App\Enums\Permission;
use App\Services\HorsLigne\ContexteOperation;
use App\Services\HorsLigne\GestionnaireOperation;
use App\Services\TentativeService;

/**
 * `tentative.auto_evaluer` (HORS_LIGNE.md A.6, priorité 1) :
 * TentativeService::autoEvaluer. L'appareil l'envoie avec `depend_de` = la
 * tentative (même uuid que son opération) : la file ne l'exécute qu'après.
 */
class AutoEvaluerTentative implements GestionnaireOperation
{
    public const TYPE = 'tentative.auto_evaluer';

    public function __construct(private TentativeService $tentatives) {}

    public function permission(): string
    {
        return Permission::EspaceEleve->value;
    }

    public function regles(): array
    {
        return [
            'tentative' => ['required', 'uuid'],
            'criteres' => ['present', 'array', 'max:8'],
            'criteres.*' => ['string', 'max:10'],
        ];
    }

    public function executer(ContexteOperation $contexte, array $charge): array
    {
        return $this->tentatives->autoEvaluer(
            $contexte->auteur,
            $charge['tentative'],
            array_values($charge['criteres']),
            $contexte->saisiLe,
        );
    }
}
