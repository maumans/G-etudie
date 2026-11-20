<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Lot 14 : un essai sur le terrain (Conakry, une préfecture), ses dates et,
 * s'il a lieu dans une école, son établissement. Sert de filtre à la
 * console (Console › Terrain) : avis, diagnostics et erreurs de la période.
 *
 * @property int $id
 * @property string $nom
 * @property string $lieu
 * @property int|null $etablissement_id
 * @property Carbon $debut
 * @property Carbon $fin
 * @property string|null $notes
 * @property int|null $creee_par
 * @property bool $est_exemple
 * @property-read Etablissement|null $etablissement
 */
#[Fillable(['nom', 'lieu', 'etablissement_id', 'debut', 'fin', 'notes', 'creee_par', 'est_exemple'])]
class CampagneTerrain extends Model
{
    protected $table = 'campagnes_terrain';

    protected function casts(): array
    {
        return [
            'debut' => 'date',
            'fin' => 'date',
            'est_exemple' => 'boolean',
        ];
    }

    /** @return BelongsTo<Etablissement, $this> */
    public function etablissement(): BelongsTo
    {
        return $this->belongsTo(Etablissement::class);
    }
}
