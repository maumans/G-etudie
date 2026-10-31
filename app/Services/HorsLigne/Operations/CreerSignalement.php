<?php

namespace App\Services\HorsLigne\Operations;

use App\Enums\CibleSignalement;
use App\Enums\MotifSignalement;
use App\Enums\Permission;
use App\Services\HorsLigne\ContexteOperation;
use App\Services\HorsLigne\GestionnaireOperation;
use App\Services\SignalementService;
use Illuminate\Validation\Rule;

/**
 * `signalement.creer` (HORS_LIGNE.md A.6, priorité 3) :
 * SignalementService::creer. Un signalement fait sans réseau part au retour
 * du réseau, une seule fois.
 */
class CreerSignalement implements GestionnaireOperation
{
    public const TYPE = 'signalement.creer';

    public function __construct(private SignalementService $signalements) {}

    public function permission(): string
    {
        return Permission::EspaceEleve->value;
    }

    public function regles(): array
    {
        return [
            'cible' => ['required', Rule::enum(CibleSignalement::class)],
            'uuid' => ['required', 'uuid'],
            'version' => ['nullable', 'integer', 'min:0'],
            'motif' => ['required', Rule::enum(MotifSignalement::class)],
            'message' => ['nullable', 'string', 'max:'.SignalementService::MESSAGE_MAX],
        ];
    }

    public function executer(ContexteOperation $contexte, array $charge): array
    {
        return $this->signalements->creer(
            $contexte->auteur,
            $contexte->uuid,
            CibleSignalement::from($charge['cible']),
            $charge['uuid'],
            isset($charge['version']) ? (int) $charge['version'] : null,
            MotifSignalement::from($charge['motif']),
            $charge['message'] ?? null,
            $contexte->saisiLe,
            $contexte->recuLe,
        );
    }
}
