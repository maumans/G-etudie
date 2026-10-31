<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * La séance du jour d'un élève (PLAN M5, mode séance) : une liste de
 * questions choisie par App\Services\SeanceService. `termine_le` arrive par
 * l'opération `seance.terminer`.
 *
 * @property int $id
 * @property string $uuid
 * @property int $user_id
 * @property Carbon $jour
 * @property list<int> $questions identifiants, dans l'ordre
 * @property int $duree_minutes
 * @property Carbon $genere_le
 * @property Carbon|null $termine_le
 */
#[Fillable(['uuid', 'user_id', 'jour', 'questions', 'duree_minutes', 'genere_le', 'termine_le'])]
class Seance extends Model
{
    protected function casts(): array
    {
        return [
            'jour' => 'date',
            'questions' => 'array',
            'duree_minutes' => 'integer',
            'genere_le' => 'datetime',
            'termine_le' => 'datetime',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return HasMany<Tentative, $this> */
    public function tentatives(): HasMany
    {
        return $this->hasMany(Tentative::class);
    }
}
