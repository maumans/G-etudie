<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Classe (« 10e année », « Terminale »). Une classe d'examen pointe vers son
 * examen ; le programme (chapitres) se range par matière et par classe.
 *
 * @property int $id
 * @property string $nom
 * @property int $ordre
 * @property int|null $examen_id
 */
#[Fillable(['nom', 'ordre', 'examen_id'])]
class Classe extends Model
{
    /** @return BelongsTo<Examen, $this> */
    public function examen(): BelongsTo
    {
        return $this->belongsTo(Examen::class);
    }

    /** @return HasMany<Chapitre, $this> */
    public function chapitres(): HasMany
    {
        return $this->hasMany(Chapitre::class);
    }
}
