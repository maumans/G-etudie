<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * Une opération de la file reçue et tranchée (HORS_LIGNE.md A.3.6) : verdict
 * `acceptee` ou `rejetee`, jamais `reporte` ni `erreur`. S'écrit par
 * App\Services\HorsLigne\SynchroService, jamais ailleurs.
 *
 * @property int $id
 * @property string $uuid
 * @property string $type
 * @property int|null $auteur_id
 * @property int|null $appareil_id
 * @property Carbon $saisi_le
 * @property Carbon $recu_le
 * @property bool $horloge_suspecte
 * @property string $verdict
 * @property array<string, mixed>|null $resultat
 * @property array<string, mixed>|null $charge
 * @property string|null $motif
 */
#[Fillable(['uuid', 'type', 'auteur_id', 'appareil_id', 'saisi_le', 'recu_le', 'horloge_suspecte', 'verdict', 'resultat', 'charge', 'motif'])]
class OperationSynchronisee extends Model
{
    public $timestamps = false;

    protected $table = 'operations_synchronisees';

    protected function casts(): array
    {
        return [
            'saisi_le' => 'datetime',
            'recu_le' => 'datetime',
            'horloge_suspecte' => 'boolean',
            'resultat' => 'array',
            'charge' => 'array',
        ];
    }
}
