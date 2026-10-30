<?php

namespace App\Models;

use App\Enums\CodeSerie;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Série du Bac (SM, SE, SS). Le CEE et le BEPC n'en ont pas.
 *
 * @property int $id
 * @property int $examen_id
 * @property CodeSerie $code
 * @property string $nom
 */
#[Fillable(['examen_id', 'code', 'nom'])]
class Serie extends Model
{
    protected function casts(): array
    {
        return ['code' => CodeSerie::class];
    }

    /** @return BelongsTo<Examen, $this> */
    public function examen(): BelongsTo
    {
        return $this->belongsTo(Examen::class);
    }
}
