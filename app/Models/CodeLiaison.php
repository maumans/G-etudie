<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * Code de liaison parent (lot 11) : six chiffres que l'élève donne à son
 * parent, valables 24 h, une fois. Seule l'empreinte est gardée.
 *
 * @property int $id
 * @property int $eleve_id
 * @property string $empreinte
 * @property Carbon $expire_le
 * @property int|null $utilise_par
 * @property Carbon|null $utilise_le
 */
#[Fillable(['eleve_id', 'empreinte', 'expire_le', 'utilise_par', 'utilise_le'])]
class CodeLiaison extends Model
{
    protected $table = 'codes_liaison';

    protected function casts(): array
    {
        return ['expire_le' => 'datetime', 'utilise_le' => 'datetime'];
    }
}
