<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $defi_id
 * @property int $user_id
 * @property Carbon|null $reussi_le
 * @property-read Defi $defi
 */
#[Fillable(['defi_id', 'user_id', 'reussi_le'])]
class ParticipationDefi extends Model
{
    protected $table = 'participations_defis';

    protected function casts(): array
    {
        return ['reussi_le' => 'datetime'];
    }

    /** @return BelongsTo<Defi, $this> */
    public function defi(): BelongsTo
    {
        return $this->belongsTo(Defi::class);
    }
}
