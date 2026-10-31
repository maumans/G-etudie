<?php

namespace App\Services\HorsLigne\Operations;

use App\Enums\EtatLecon;
use App\Enums\Permission;
use App\Models\Lecon;
use App\Services\HorsLigne\ContexteOperation;
use App\Services\HorsLigne\GestionnaireOperation;
use App\Services\HorsLigne\OperationRejetee;
use App\Services\ProgressionService;
use Illuminate\Validation\Rule;

/**
 * `lecon.progression` (HORS_LIGNE.md A.6, priorité 3) : ProgressionService::lecon.
 * `etat` absent = inchangé ; « aucun » = effacé.
 */
class ProgressionLecon implements GestionnaireOperation
{
    public const TYPE = 'lecon.progression';

    public function __construct(private ProgressionService $progression) {}

    public function permission(): string
    {
        return Permission::EspaceEleve->value;
    }

    public function regles(): array
    {
        return [
            'lecon' => ['required', 'uuid'],
            'etat' => ['sometimes', Rule::in([...array_column(EtatLecon::cases(), 'value'), 'aucun'])],
            'position' => ['nullable', 'integer', 'min:0', 'max:100'],
        ];
    }

    public function executer(ContexteOperation $contexte, array $charge): array
    {
        $lecon = Lecon::query()->where('uuid', $charge['lecon'])->first()
            ?? throw new OperationRejetee('Cette leçon n\'existe plus.');

        $etat = match (true) {
            ! array_key_exists('etat', $charge) => false,
            $charge['etat'] === 'aucun' => null,
            default => EtatLecon::from($charge['etat']),
        };

        $progression = $this->progression->lecon(
            $contexte->auteur,
            $lecon,
            $etat,
            isset($charge['position']) ? (int) $charge['position'] : null,
            $contexte->saisiLe,
        );

        return ['etat' => $progression->etat?->value, 'position' => $progression->position];
    }
}
