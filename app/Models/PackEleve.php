<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Un pack pris par un élève (HL-D3). `expire_le` : fin d'abonnement + délai
 * de grâce pour un pack d'abonné (HL-D4), vide pour son pack gratuit.
 * `retire_le` : l'élève l'a supprimé, la place gratuite est libre.
 *
 * @property int $id
 * @property int $user_id
 * @property int $pack_id
 * @property Carbon $pris_le
 * @property Carbon|null $expire_le
 * @property Carbon|null $retire_le
 * @property-read Pack $pack
 */
#[Fillable(['user_id', 'pack_id', 'pris_le', 'expire_le', 'retire_le'])]
class PackEleve extends Model
{
    public $timestamps = false;

    protected $table = 'packs_eleves';

    protected function casts(): array
    {
        return [
            'pris_le' => 'datetime',
            'expire_le' => 'datetime',
            'retire_le' => 'datetime',
        ];
    }

    /** @return BelongsTo<Pack, $this> */
    public function pack(): BelongsTo
    {
        return $this->belongsTo(Pack::class);
    }

    public function estActif(): bool
    {
        return $this->retire_le === null;
    }

    public function estExpire(?Carbon $maintenant = null): bool
    {
        return $this->expire_le !== null && $this->expire_le->lessThanOrEqualTo($maintenant ?? now());
    }
}
