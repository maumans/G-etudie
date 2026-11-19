<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Un élève dans un groupe (lot 11). Parti ou retiré : `quitte_le` ; le
 * rejoindre de nouveau rouvre la même ligne.
 *
 * @property int $id
 * @property int $groupe_id
 * @property int $eleve_id
 * @property Carbon $rejoint_le
 * @property Carbon|null $quitte_le
 * @property int|null $retire_par
 * @property Carbon|null $muet_jusqu_au lot 12 : parole retirée dans le fil jusqu'à cette date
 * @property bool $classement_accepte lot 12 : apparaît (par son pseudo) au classement des défis
 * @property-read Groupe $groupe
 * @property-read User $eleve
 */
#[Fillable(['groupe_id', 'eleve_id', 'rejoint_le', 'quitte_le', 'retire_par', 'muet_jusqu_au', 'classement_accepte'])]
class MembreGroupe extends Model
{
    protected $table = 'membres_groupes';

    protected function casts(): array
    {
        return ['rejoint_le' => 'datetime', 'quitte_le' => 'datetime', 'muet_jusqu_au' => 'datetime', 'classement_accepte' => 'boolean'];
    }

    /** @param  Builder<self>  $requete */
    public function scopeActifs(Builder $requete): void
    {
        $requete->whereNull('quitte_le');
    }

    /** @return BelongsTo<Groupe, $this> */
    public function groupe(): BelongsTo
    {
        return $this->belongsTo(Groupe::class);
    }

    /** @return BelongsTo<User, $this> */
    public function eleve(): BelongsTo
    {
        return $this->belongsTo(User::class, 'eleve_id');
    }
}
