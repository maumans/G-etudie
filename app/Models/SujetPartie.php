<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * Une partie d'un sujet (« Exercice 2 », « Problème ») : un titre, un barème
 * imprimé, une consigne commune (document de blocs) et ses questions.
 *
 * @property int $id
 * @property string $uuid
 * @property int $sujet_id
 * @property int $ordre
 * @property string $titre
 * @property string|null $bareme
 * @property array<string, mixed> $consigne
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read Sujet $sujet
 * @property-read Collection<int, Question> $questions
 */
#[Fillable(['uuid', 'sujet_id', 'ordre', 'titre', 'bareme', 'consigne'])]
class SujetPartie extends Model
{
    protected function casts(): array
    {
        return [
            'ordre' => 'integer',
            'bareme' => 'decimal:2',
            'consigne' => 'array',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    /** @return BelongsTo<Sujet, $this> */
    public function sujet(): BelongsTo
    {
        return $this->belongsTo(Sujet::class);
    }

    /** @return HasMany<Question, $this> */
    public function questions(): HasMany
    {
        return $this->hasMany(Question::class)->orderBy('ordre_sujet')->orderBy('id');
    }
}
