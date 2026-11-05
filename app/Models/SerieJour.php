<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * Un jour d'activité d'un élève (PLAN M9), au jour du geste (`saisi_le`,
 * HORS_LIGNE.md A.6). Tenu par App\Services\MotivationService.
 *
 * @property int $id
 * @property int $user_id
 * @property Carbon $jour
 * @property int $reponses
 * @property int $secondes
 * @property bool $objectif_atteint
 */
#[Fillable(['user_id', 'jour', 'reponses', 'secondes', 'objectif_atteint'])]
class SerieJour extends Model
{
    protected $table = 'series_jours';

    protected function casts(): array
    {
        return [
            'jour' => 'date',
            'reponses' => 'integer',
            'secondes' => 'integer',
            'objectif_atteint' => 'boolean',
        ];
    }
}
