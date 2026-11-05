<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Un défi de la semaine (PLAN M9) : « `objectif` bonnes réponses en
 * `matiere` du lundi `semaine` au dimanche ». Partagé par tous les élèves
 * à qui il est proposé (`participations_defis`).
 *
 * @property int $id
 * @property Carbon $semaine lundi
 * @property int $matiere_id
 * @property string $type `bonnes_reponses`
 * @property int $objectif
 * @property-read Matiere $matiere
 */
#[Fillable(['semaine', 'matiere_id', 'type', 'objectif'])]
class Defi extends Model
{
    public const BONNES_REPONSES = 'bonnes_reponses';

    protected function casts(): array
    {
        return ['semaine' => 'date', 'objectif' => 'integer'];
    }

    /** @return BelongsTo<Matiere, $this> */
    public function matiere(): BelongsTo
    {
        return $this->belongsTo(Matiere::class);
    }
}
