<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * Un devoir (lot 11, PLAN M14) : des questions publiées, une échéance. Le
 * rendu d'un élève est sa séance du devoir (`seances.devoir_id`), faite par
 * le moteur de séance et la file d'opérations.
 *
 * @property int $id
 * @property int $groupe_id
 * @property int|null $auteur_id
 * @property string $titre
 * @property string|null $consigne
 * @property Carbon $echeance_le
 * @property Carbon $publie_le
 * @property bool $est_exemple
 * @property-read int|null $questions_count
 * @property-read Groupe $groupe
 */
#[Fillable(['groupe_id', 'auteur_id', 'titre', 'consigne', 'echeance_le', 'publie_le', 'est_exemple'])]
class Devoir extends Model
{
    protected function casts(): array
    {
        return ['echeance_le' => 'datetime', 'publie_le' => 'datetime', 'est_exemple' => 'boolean'];
    }

    /** @return BelongsTo<Groupe, $this> */
    public function groupe(): BelongsTo
    {
        return $this->belongsTo(Groupe::class);
    }

    /** @return BelongsToMany<Question, $this> */
    public function questions(): BelongsToMany
    {
        return $this->belongsToMany(Question::class, 'devoirs_questions')->withPivot('ordre')->orderByPivot('ordre');
    }

    /** @return HasMany<Seance, $this> */
    public function seances(): HasMany
    {
        return $this->hasMany(Seance::class);
    }
}
