<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Notion d'un chapitre : l'unité de la maîtrise (PLAN M8). Toute leçon y est
 * rattachée (PLAN M17).
 *
 * @property int $id
 * @property int $chapitre_id
 * @property string $titre
 * @property int $ordre
 * @property bool $est_exemple
 */
#[Fillable(['chapitre_id', 'titre', 'ordre', 'est_exemple'])]
class Notion extends Model
{
    protected function casts(): array
    {
        return ['est_exemple' => 'boolean'];
    }

    /** @return BelongsTo<Chapitre, $this> */
    public function chapitre(): BelongsTo
    {
        return $this->belongsTo(Chapitre::class);
    }

    /** @return HasMany<Lecon, $this> */
    public function lecons(): HasMany
    {
        return $this->hasMany(Lecon::class);
    }
}
