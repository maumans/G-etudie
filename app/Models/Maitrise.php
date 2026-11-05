<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * La maîtrise d'un élève sur une notion (PLAN M8), tenue par
 * App\Services\MaitriseService — **jamais écrite ailleurs**, jamais
 * recalculée en JavaScript (HORS_LIGNE.md A.10).
 *
 * @property int $id
 * @property int $user_id
 * @property int $notion_id
 * @property int $score 0 à 100
 * @property int $reponses réponses notées retenues pour le calcul
 * @property int $palier 0 à 5 (révision espacée)
 * @property Carbon|null $prochaine_revision_le
 * @property Carbon $derniere_reponse_le
 * @property Carbon $maj_le
 * @property-read Notion $notion
 */
#[Fillable(['user_id', 'notion_id', 'score', 'reponses', 'palier', 'prochaine_revision_le', 'derniere_reponse_le', 'maj_le'])]
class Maitrise extends Model
{
    public $timestamps = false;

    protected function casts(): array
    {
        return [
            'score' => 'integer',
            'reponses' => 'integer',
            'palier' => 'integer',
            'prochaine_revision_le' => 'date',
            'derniere_reponse_le' => 'datetime',
            'maj_le' => 'datetime',
        ];
    }

    /** @return BelongsTo<Notion, $this> */
    public function notion(): BelongsTo
    {
        return $this->belongsTo(Notion::class);
    }
}
