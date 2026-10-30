<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * Année scolaire : les épreuves (coefficients, durées) en dépendent, car elles
 * changent d'une année à l'autre (PLAN M3). Une seule est « courante ».
 *
 * @property int $id
 * @property string $libelle
 * @property Carbon $debut
 * @property Carbon $fin
 * @property bool $courante
 * @property-read int $epreuves_count withCount
 * @property-read int $coefficients_count withCount (épreuves au coefficient saisi)
 */
#[Fillable(['libelle', 'debut', 'fin', 'courante'])]
class AnneeScolaire extends Model
{
    protected $table = 'annees_scolaires';

    protected function casts(): array
    {
        return [
            'debut' => 'date',
            'fin' => 'date',
            'courante' => 'boolean',
        ];
    }

    /** @return HasMany<Epreuve, $this> */
    public function epreuves(): HasMany
    {
        return $this->hasMany(Epreuve::class);
    }

    public static function courante(): ?self
    {
        return self::query()->where('courante', true)->first();
    }
}
