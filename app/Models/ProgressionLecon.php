<?php

namespace App\Models;

use App\Enums\EtatLecon;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Où en est un élève dans une leçon : « compris / à revoir » et position de
 * lecture (0 à 100 %). Chaque champ porte l'heure de sa saisie sur
 * l'appareil : la plus récente gagne, quel que soit l'ordre de réception
 * (HORS_LIGNE.md A.6). Écrit par App\Services\ProgressionService seulement.
 *
 * @property int $id
 * @property int $user_id
 * @property int $lecon_id
 * @property EtatLecon|null $etat
 * @property Carbon|null $etat_saisi_le
 * @property int $position
 * @property Carbon|null $position_saisie_le
 * @property Carbon $updated_at
 * @property-read Lecon $lecon
 */
#[Fillable(['user_id', 'lecon_id', 'etat', 'etat_saisi_le', 'position', 'position_saisie_le'])]
class ProgressionLecon extends Model
{
    protected $table = 'progressions_lecons';

    protected function casts(): array
    {
        return [
            'etat' => EtatLecon::class,
            'etat_saisi_le' => 'datetime',
            'position' => 'integer',
            'position_saisie_le' => 'datetime',
        ];
    }

    /** @return BelongsTo<Lecon, $this> */
    public function lecon(): BelongsTo
    {
        return $this->belongsTo(Lecon::class);
    }
}
