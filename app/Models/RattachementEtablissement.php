<?php

namespace App\Models;

use App\Enums\Role;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Un gestionnaire ou un enseignant rattaché à un établissement (lot 11,
 * DEVBOOK § 7). Retiré, il reste daté (`retire_le`).
 *
 * @property int $id
 * @property int $user_id
 * @property int $etablissement_id
 * @property Role $role
 * @property Carbon $rattache_le
 * @property Carbon|null $retire_le
 * @property-read User $user
 * @property-read Etablissement $etablissement
 */
#[Fillable(['user_id', 'etablissement_id', 'role', 'rattache_le', 'retire_le'])]
class RattachementEtablissement extends Model
{
    protected $table = 'rattachements_etablissement';

    protected function casts(): array
    {
        return ['role' => Role::class, 'rattache_le' => 'datetime', 'retire_le' => 'datetime'];
    }

    /** @param  Builder<self>  $requete */
    public function scopeActifs(Builder $requete): void
    {
        $requete->whereNull('retire_le');
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<Etablissement, $this> */
    public function etablissement(): BelongsTo
    {
        return $this->belongsTo(Etablissement::class);
    }
}
