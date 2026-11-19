<?php

namespace App\Models;

use App\Enums\MotifSignalementPublication;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Un élève signale une publication du fil de son groupe (lot 12) : une fois
 * par publication et par élève.
 *
 * @property int $id
 * @property int $publication_id
 * @property int $auteur_id
 * @property MotifSignalementPublication $motif
 * @property Carbon $created_at
 * @property-read PublicationGroupe $publication
 */
#[Fillable(['publication_id', 'auteur_id', 'motif'])]
class SignalementPublication extends Model
{
    protected $table = 'signalements_publications';

    protected function casts(): array
    {
        return ['motif' => MotifSignalementPublication::class];
    }

    /** @return BelongsTo<PublicationGroupe, $this> */
    public function publication(): BelongsTo
    {
        return $this->belongsTo(PublicationGroupe::class, 'publication_id');
    }
}
