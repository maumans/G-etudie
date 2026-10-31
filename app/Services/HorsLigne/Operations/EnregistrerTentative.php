<?php

namespace App\Services\HorsLigne\Operations;

use App\Enums\Permission;
use App\Models\Question;
use App\Models\Seance;
use App\Services\HorsLigne\ContexteOperation;
use App\Services\HorsLigne\GestionnaireOperation;
use App\Services\HorsLigne\OperationRejetee;
use App\Services\TentativeService;

/** `tentative.enregistrer` (HORS_LIGNE.md A.6, priorité 1) : TentativeService::enregistrer. */
class EnregistrerTentative implements GestionnaireOperation
{
    public const TYPE = 'tentative.enregistrer';

    public function __construct(private TentativeService $tentatives) {}

    public function permission(): string
    {
        return Permission::EspaceEleve->value;
    }

    public function regles(): array
    {
        return [
            'question' => ['required', 'uuid'],
            'version' => ['required', 'integer', 'min:1'],
            'reponse' => ['required', 'array'],
            'reponse.option' => ['required', 'string', 'max:10'],
            'seance' => ['nullable', 'uuid'],
            'duree_secondes' => ['nullable', 'integer', 'min:0', 'max:65535'],
        ];
    }

    public function executer(ContexteOperation $contexte, array $charge): array
    {
        $question = Question::query()->where('uuid', $charge['question'])->first()
            ?? throw new OperationRejetee('Cette question n\'existe plus.');
        $seance = null;

        if (($charge['seance'] ?? null) !== null) {
            $seance = Seance::query()->where('uuid', $charge['seance'])->first()
                ?? throw new OperationRejetee('Cette séance n\'existe plus.');
        }

        return $this->tentatives->enregistrer(
            $contexte->auteur,
            $contexte->uuid,
            $question,
            (int) $charge['version'],
            ['option' => $charge['reponse']['option']],
            $seance,
            isset($charge['duree_secondes']) ? (int) $charge['duree_secondes'] : null,
            $contexte->saisiLe,
            $contexte->recuLe,
        );
    }
}
