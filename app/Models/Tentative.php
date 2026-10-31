<?php

namespace App\Models;

use App\Enums\ModeTentative;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Une réponse d'élève (PLAN § 6) : **ajout seulement**, jamais modifiée.
 * `correcte` est la correction du serveur (HORS_LIGNE.md A.6) ; celle de
 * l'appareil n'est qu'un affichage. `uuid` = celui de l'opération de la file.
 *
 * @property int $id
 * @property string $uuid
 * @property int $user_id
 * @property int $question_id
 * @property int $version
 * @property int|null $seance_id
 * @property ModeTentative $mode
 * @property array<string, mixed> $reponse
 * @property bool $correcte
 * @property int|null $duree_secondes
 * @property int $indices_utilises
 * @property Carbon $saisi_le
 * @property Carbon $recu_le
 */
#[Fillable(['uuid', 'user_id', 'question_id', 'version', 'seance_id', 'mode', 'reponse', 'correcte', 'duree_secondes', 'indices_utilises', 'saisi_le', 'recu_le'])]
class Tentative extends Model
{
    protected function casts(): array
    {
        return [
            'mode' => ModeTentative::class,
            'reponse' => 'array',
            'correcte' => 'boolean',
            'duree_secondes' => 'integer',
            'indices_utilises' => 'integer',
            'saisi_le' => 'datetime',
            'recu_le' => 'datetime',
        ];
    }

    /** @return BelongsTo<Question, $this> */
    public function question(): BelongsTo
    {
        return $this->belongsTo(Question::class);
    }
}
