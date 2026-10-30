<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Chapitre du programme d'une matière, pour une classe. Le programme vient
 * de l'équipe pédagogique (CLAUDE.md § 5) ; un chapitre de démonstration
 * porte `est_exemple`.
 *
 * @property int $id
 * @property int $matiere_id
 * @property int $classe_id
 * @property string $titre
 * @property int $ordre
 * @property bool $est_exemple
 */
#[Fillable(['matiere_id', 'classe_id', 'titre', 'ordre', 'est_exemple'])]
class Chapitre extends Model
{
    protected function casts(): array
    {
        return ['est_exemple' => 'boolean'];
    }

    /** @return BelongsTo<Matiere, $this> */
    public function matiere(): BelongsTo
    {
        return $this->belongsTo(Matiere::class);
    }

    /** @return BelongsTo<Classe, $this> */
    public function classe(): BelongsTo
    {
        return $this->belongsTo(Classe::class);
    }

    /** @return HasMany<Notion, $this> */
    public function notions(): HasMany
    {
        return $this->hasMany(Notion::class)->orderBy('ordre');
    }
}
