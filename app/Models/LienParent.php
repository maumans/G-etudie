<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Un parent suit un enfant (lot 11, PLAN M15). Le lien naît d'un code que
 * l'élève a donné (CodeLiaison) ; l'élève ou le parent peut le révoquer.
 *
 * @property int $id
 * @property int $parent_id
 * @property int $eleve_id
 * @property Carbon $lie_le
 * @property Carbon|null $revoque_le
 * @property-read User $parent
 * @property-read User $eleve
 */
#[Fillable(['parent_id', 'eleve_id', 'lie_le', 'revoque_le'])]
class LienParent extends Model
{
    protected $table = 'liens_parents';

    protected function casts(): array
    {
        return ['lie_le' => 'datetime', 'revoque_le' => 'datetime'];
    }

    /** @param  Builder<self>  $requete */
    public function scopeActifs(Builder $requete): void
    {
        $requete->whereNull('revoque_le');
    }

    /** @return BelongsTo<User, $this> */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'parent_id');
    }

    /** @return BelongsTo<User, $this> */
    public function eleve(): BelongsTo
    {
        return $this->belongsTo(User::class, 'eleve_id');
    }
}
