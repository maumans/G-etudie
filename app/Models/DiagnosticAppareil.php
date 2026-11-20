<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Lot 14 : l'état d'un appareil au moment où on l'a demandé (« Mon compte ›
 * Appareils › Cet appareil »), retrouvé par son code court. `donnees` ne
 * contient rien de personnel : versions, stockage, file, réseau, écran
 * (TerrainService::CHAMPS_DIAGNOSTIC).
 *
 * @property int $id
 * @property string $uuid
 * @property string $code
 * @property int|null $appareil_id
 * @property int|null $user_id
 * @property array<string, mixed> $donnees
 * @property string|null $version_app
 * @property Carbon $releve_le
 * @property bool $est_exemple
 * @property-read Appareil|null $appareil
 * @property-read User|null $compte
 */
#[Fillable(['uuid', 'code', 'appareil_id', 'user_id', 'donnees', 'version_app', 'releve_le', 'est_exemple'])]
class DiagnosticAppareil extends Model
{
    protected $table = 'diagnostics_appareil';

    protected function casts(): array
    {
        return [
            'donnees' => 'array',
            'releve_le' => 'datetime',
            'est_exemple' => 'boolean',
        ];
    }

    /** @return BelongsTo<Appareil, $this> */
    public function appareil(): BelongsTo
    {
        return $this->belongsTo(Appareil::class);
    }

    /** @return BelongsTo<User, $this> */
    public function compte(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
