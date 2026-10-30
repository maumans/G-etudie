<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Une ligne du journal des accès sensibles. S'écrit par
 * App\Support\JournalAcces::consigner(), jamais ailleurs ; ne se modifie pas.
 *
 * @property int $id
 * @property string $action
 * @property int|null $auteur_id
 * @property string|null $cible_type
 * @property int|null $cible_id
 * @property string|null $ip
 * @property string|null $agent
 * @property array<string, mixed>|null $details
 * @property Carbon $cree_le
 */
#[Fillable(['action', 'auteur_id', 'cible_type', 'cible_id', 'ip', 'agent', 'details'])]
class EntreeJournalAcces extends Model
{
    public const CREATED_AT = 'cree_le';

    public const UPDATED_AT = null;

    protected $table = 'journal_acces_plateforme';

    protected function casts(): array
    {
        return [
            'details' => 'array',
            'cree_le' => 'datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function auteur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'auteur_id');
    }
}
