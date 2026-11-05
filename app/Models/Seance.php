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
 * Lot 6 (HL4) : les séances sont **préparées d'avance** (trois à la fois,
 * `rang` 1 à 3, `jour` vide) et envoyées à l'appareil ; une séance prend son
 * jour quand l'élève la commence (en ligne) ou y répond (hors ligne).
 * `remplacee_le` : remplacée par une séance plus fraîche, mais toujours
 * valable pour un appareil qui l'avait déjà.
 *
 * @property int $id
 * @property string $uuid
 * @property int $user_id
 * @property Carbon|null $jour vide tant qu'elle n'est pas commencée
 * @property int|null $rang
 * @property list<int> $questions identifiants, dans l'ordre
 * @property int $duree_minutes
 * @property Carbon $genere_le
 * @property Carbon|null $termine_le
 * @property Carbon|null $remplacee_le
 */
#[Fillable(['uuid', 'user_id', 'jour', 'rang', 'questions', 'duree_minutes', 'genere_le', 'termine_le', 'remplacee_le'])]
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
            'rang' => 'integer',
            'remplacee_le' => 'datetime',
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
