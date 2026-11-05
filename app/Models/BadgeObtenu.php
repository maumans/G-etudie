<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $user_id
 * @property int $badge_id
 * @property Carbon $obtenu_le
 * @property-read Badge $badge
 */
#[Fillable(['user_id', 'badge_id', 'obtenu_le'])]
class BadgeObtenu extends Model
{
    protected $table = 'badges_obtenus';

    protected function casts(): array
    {
        return ['obtenu_le' => 'datetime'];
    }

    /** @return BelongsTo<Badge, $this> */
    public function badge(): BelongsTo
    {
        return $this->belongsTo(Badge::class);
    }
}
