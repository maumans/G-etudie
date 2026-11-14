<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * Une licence d'établissement (lot 11, PLAN M14 et M16) : des places
 * d'abonnement achetées par l'école (contrat hors application, saisi dans la
 * console), que son gestionnaire attribue à ses élèves.
 *
 * @property int $id
 * @property int $etablissement_id
 * @property int $places
 * @property Carbon $debut
 * @property Carbon $fin
 * @property string|null $reference
 * @property int|null $cree_par
 * @property bool $est_exemple
 * @property-read Etablissement $etablissement
 */
#[Fillable(['etablissement_id', 'places', 'debut', 'fin', 'reference', 'cree_par', 'est_exemple'])]
class LicenceEtablissement extends Model
{
    protected $table = 'licences_etablissement';

    protected function casts(): array
    {
        return ['debut' => 'datetime', 'fin' => 'datetime', 'places' => 'integer', 'est_exemple' => 'boolean'];
    }

    /** @return BelongsTo<Etablissement, $this> */
    public function etablissement(): BelongsTo
    {
        return $this->belongsTo(Etablissement::class);
    }

    /** @return HasMany<Abonnement, $this> */
    public function abonnements(): HasMany
    {
        return $this->hasMany(Abonnement::class, 'licence_id');
    }
}
