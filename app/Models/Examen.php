<?php

namespace App\Models;

use App\Enums\CodeExamen;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * CEE, BEPC ou Baccalauréat unique. Semés par ReferentielSeeder, jamais
 * créés depuis le back-office.
 *
 * @property int $id
 * @property CodeExamen $code
 * @property string $nom
 * @property int $ordre
 */
#[Fillable(['code', 'nom', 'ordre'])]
class Examen extends Model
{
    protected function casts(): array
    {
        return ['code' => CodeExamen::class];
    }

    /** @return HasMany<Serie, $this> */
    public function series(): HasMany
    {
        return $this->hasMany(Serie::class);
    }

    /** @return HasOne<Classe, $this> */
    public function classe(): HasOne
    {
        return $this->hasOne(Classe::class);
    }

    /** @return HasMany<Epreuve, $this> */
    public function epreuves(): HasMany
    {
        return $this->hasMany(Epreuve::class);
    }
}
