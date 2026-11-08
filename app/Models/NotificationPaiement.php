<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Un webhook d'opérateur, reçu une fois (unicité passerelle + identifiant
 * d'événement) : le rejouer ne refait rien (PaiementService::traiterNotification).
 *
 * @property int $id
 * @property string $passerelle
 * @property string $identifiant_evenement
 * @property int|null $paiement_id
 * @property array<string, mixed> $charge
 * @property string|null $resultat
 * @property Carbon $recu_le
 * @property Carbon|null $traite_le
 */
#[Fillable(['passerelle', 'identifiant_evenement', 'paiement_id', 'charge', 'resultat', 'recu_le', 'traite_le'])]
class NotificationPaiement extends Model
{
    protected $table = 'notifications_paiement';

    public $timestamps = false;

    protected function casts(): array
    {
        return [
            'charge' => 'array',
            'recu_le' => 'datetime',
            'traite_le' => 'datetime',
        ];
    }

    /** @return BelongsTo<Paiement, $this> */
    public function paiement(): BelongsTo
    {
        return $this->belongsTo(Paiement::class);
    }
}
