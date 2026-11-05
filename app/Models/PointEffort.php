<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * Un gain de points d'effort (PLAN M9) : ajout seulement, une ligne par
 * source (`source` + `source_cle` uniques par élève : un gain rejoué ne
 * compte qu'une fois). Daté de la **réception** (`recu_le`, A.6).
 *
 * @property int $id
 * @property int $user_id
 * @property string $source reponse | seance | examen_blanc | badge | defi
 * @property string $source_cle
 * @property int $points
 * @property Carbon $recu_le
 */
#[Fillable(['user_id', 'source', 'source_cle', 'points', 'recu_le'])]
class PointEffort extends Model
{
    protected $table = 'points_effort';

    protected function casts(): array
    {
        return ['points' => 'integer', 'recu_le' => 'datetime'];
    }
}
