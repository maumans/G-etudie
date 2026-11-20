<?php

namespace App\Models;

use App\Enums\TypeErreurAppareil;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Lot 14 : une erreur captée sur les appareils, une ligne par empreinte
 * (type, message et source normalisés, version). Rattachée au dernier
 * appareil qui l'a vue, jamais à un élève.
 *
 * @property int $id
 * @property string $empreinte
 * @property TypeErreurAppareil $type
 * @property string $message
 * @property string|null $source
 * @property string|null $pile
 * @property string|null $version_app
 * @property string|null $navigateur
 * @property int $occurrences
 * @property int|null $dernier_appareil_id
 * @property Carbon $premiere_le
 * @property Carbon $derniere_le
 * @property bool $est_exemple
 */
#[Fillable(['empreinte', 'type', 'message', 'source', 'pile', 'version_app', 'navigateur', 'occurrences', 'dernier_appareil_id', 'premiere_le', 'derniere_le', 'est_exemple'])]
class ErreurAppareil extends Model
{
    protected $table = 'erreurs_appareil';

    protected function casts(): array
    {
        return [
            'type' => TypeErreurAppareil::class,
            'occurrences' => 'integer',
            'premiere_le' => 'datetime',
            'derniere_le' => 'datetime',
            'est_exemple' => 'boolean',
        ];
    }

    /** @return BelongsTo<Appareil, $this> */
    public function dernierAppareil(): BelongsTo
    {
        return $this->belongsTo(Appareil::class, 'dernier_appareil_id');
    }
}
