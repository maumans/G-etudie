<?php

namespace App\Services\HorsLigne\Operations;

use App\Enums\EtiquetteAvis;
use App\Enums\Permission;
use App\Enums\ReponseAvis;
use App\Services\HorsLigne\ContexteOperation;
use App\Services\HorsLigne\GestionnaireOperation;
use App\Services\TerrainService;
use Illuminate\Validation\Rule;

/**
 * `avis.donner` (lot 14, priorité 8) : TerrainService::donnerAvis. Un avis
 * donné sans réseau part au retour du réseau, une seule fois.
 */
class DonnerAvis implements GestionnaireOperation
{
    public const TYPE = 'avis.donner';

    public function __construct(private TerrainService $terrain) {}

    public function permission(): string
    {
        return Permission::EspaceEleve->value;
    }

    public function regles(): array
    {
        return [
            'ecran' => ['required', Rule::in(TerrainService::ECRANS)],
            'reponse' => ['required', Rule::enum(ReponseAvis::class)],
            'etiquettes' => ['present', 'array', 'max:6'],
            'etiquettes.*' => [Rule::enum(EtiquetteAvis::class)],
            'commentaire' => ['nullable', 'string', 'max:'.TerrainService::COMMENTAIRE_MAX],
            'version_app' => ['nullable', 'string', 'max:64'],
        ];
    }

    public function executer(ContexteOperation $contexte, array $charge): array
    {
        return $this->terrain->donnerAvis(
            $contexte->auteur,
            $contexte->appareil,
            $contexte->uuid,
            $charge['ecran'],
            ReponseAvis::from($charge['reponse']),
            array_values($charge['etiquettes']),
            $charge['commentaire'] ?? null,
            $charge['version_app'] ?? null,
            $contexte->saisiLe,
        );
    }
}
