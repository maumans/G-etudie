<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Un code prépayé : son **empreinte** seulement (HMAC), et ses quatre
 * derniers caractères pour l'assistance. Utilisé une fois.
 *
 * @property int $id
 * @property int $lot_id
 * @property string $empreinte
 * @property string $fin
 * @property int|null $utilise_par
 * @property Carbon|null $utilise_le
 * @property-read LotCodes $lot
 */
#[Fillable(['lot_id', 'empreinte', 'fin', 'utilise_par', 'utilise_le'])]
class CodeAcces extends Model
{
    protected $table = 'codes_acces';

    public $timestamps = false;

    protected function casts(): array
    {
        return ['utilise_le' => 'datetime'];
    }

    /** @return BelongsTo<LotCodes, $this> */
    public function lot(): BelongsTo
    {
        return $this->belongsTo(LotCodes::class, 'lot_id');
    }
}
