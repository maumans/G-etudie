<?php

namespace App\Models;

use App\Enums\CodeExamen;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;

/**
 * CEE, BEPC ou Baccalauréat unique. Semés par ReferentielSeeder, jamais
 * créés depuis le back-office.
 *
 * @property int $id
 * @property CodeExamen $code
 * @property string $nom
 * @property int $ordre
 * @property Carbon|null $date_prochaine_session saisie par le responsable pédagogique, jamais semée
 * @property string|null $moyenne_admission moyenne d'admission, saisie par l'équipe (lot 5), jamais semée
 */
#[Fillable(['code', 'nom', 'ordre', 'date_prochaine_session', 'moyenne_admission'])]
class Examen extends Model
{
    protected function casts(): array
    {
        return [
            'code' => CodeExamen::class,
            'date_prochaine_session' => 'date',
            'moyenne_admission' => 'decimal:2',
        ];
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
