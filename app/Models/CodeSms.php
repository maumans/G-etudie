<?php

namespace App\Models;

use App\Enums\MotifCode;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Un code envoyé par SMS. Géré par App\Services\CodeSmsService seulement.
 *
 * @property int $id
 * @property string $telephone
 * @property MotifCode $motif
 * @property int|null $user_id
 * @property string $code_hache
 * @property int $essais
 * @property Carbon $expire_le
 * @property Carbon|null $utilise_le
 */
#[Fillable(['telephone', 'motif', 'user_id', 'code_hache', 'expire_le'])]
#[Hidden(['code_hache'])]
class CodeSms extends Model
{
    protected $table = 'codes_sms';

    protected function casts(): array
    {
        return [
            'motif' => MotifCode::class,
            'essais' => 'integer',
            'expire_le' => 'datetime',
            'utilise_le' => 'datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Codes encore utilisables pour ce numéro et ce motif.
     *
     * @param  Builder<CodeSms>  $requete
     */
    public function scopeValables(Builder $requete, string $telephone, MotifCode $motif): void
    {
        $requete->where('telephone', $telephone)
            ->where('motif', $motif->value)
            ->whereNull('utilise_le')
            ->where('expire_le', '>', now());
    }
}
