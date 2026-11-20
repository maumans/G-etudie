<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * La jauge d'un élève relevée pour une semaine (lot 13, « Impact »). Écrit
 * par App\Services\Plateforme\ReleveJaugeService seulement ; lu par
 * App\Services\Plateforme\PlateformeService.
 *
 * @property int $id
 * @property int $user_id
 * @property Carbon $semaine lundi de la semaine relevée
 * @property int $pourcentage
 * @property int $examen_id
 * @property int|null $serie_id
 * @property int|null $etablissement_id
 */
#[Fillable(['user_id', 'semaine', 'pourcentage', 'examen_id', 'serie_id', 'etablissement_id'])]
class ReleveJauge extends Model
{
    protected $table = 'releves_jauge';

    protected function casts(): array
    {
        return [
            'semaine' => 'date',
            'pourcentage' => 'integer',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
