<?php

namespace App\Services\HorsLigne\Operations;

use App\Enums\Permission;
use App\Services\HorsLigne\ContexteOperation;
use App\Services\HorsLigne\GestionnaireOperation;
use App\Services\TerrainService;

/**
 * `erreurs.signaler` (lot 14, priorité 9, la plus basse) :
 * TerrainService::signalerErreurs. Un lot d'erreurs captées sur l'appareil,
 * rattaché à l'appareil seulement. La validation est large à dessein : une
 * erreur mal formée est ignorée par le service, jamais refusée (un refus
 * s'afficherait à l'élève dans « À corriger »).
 */
class SignalerErreurs implements GestionnaireOperation
{
    public const TYPE = 'erreurs.signaler';

    public function __construct(private TerrainService $terrain) {}

    public function permission(): string
    {
        return Permission::DiagnostiquerAppareil->value;
    }

    public function regles(): array
    {
        return [
            'erreurs' => ['present', 'array', 'max:50'],
            'erreurs.*.type' => ['required', 'string', 'max:12'],
            'erreurs.*.message' => ['required', 'string', 'max:2000'],
            'erreurs.*.source' => ['nullable', 'string', 'max:2000'],
            'erreurs.*.pile' => ['nullable', 'string', 'max:8000'],
            'erreurs.*.version_app' => ['nullable', 'string', 'max:64'],
            'erreurs.*.fois' => ['nullable', 'integer', 'min:1'],
            'erreurs.*.vue_le' => ['nullable', 'string', 'max:40'],
        ];
    }

    public function executer(ContexteOperation $contexte, array $charge): array
    {
        return $this->terrain->signalerErreurs(
            $contexte->appareil,
            array_values($charge['erreurs']),
            $contexte->appareil->libelle,
            $contexte->recuLe,
        );
    }
}
