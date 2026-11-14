<?php

namespace App\Models;

use App\Enums\FormuleAbonnement;
use App\Enums\MoyenPaiement;
use App\Enums\StatutPaiement;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;

/**
 * Un paiement par mobile money (PLAN M16). Créé, conclu et relu par
 * App\Services\PaiementService seulement. Le **montant** vient de la
 * formule (config), jamais du téléphone ; le **numéro du payeur** est
 * chiffré en base, et seuls ses deux derniers chiffres s'affichent.
 *
 * @property int $id
 * @property string $uuid
 * @property int $user_id le payeur
 * @property int|null $beneficiaire_id lot 11 : l'enfant dont un parent paie l'abonnement (sinon le payeur lui-même)
 * @property FormuleAbonnement $formule
 * @property int $montant_gnf
 * @property MoyenPaiement $moyen
 * @property string $passerelle
 * @property string $numero_payeur chiffré
 * @property string $numero_fin
 * @property string|null $reference_operateur
 * @property StatutPaiement $statut
 * @property string|null $motif_echec
 * @property string|null $url_paiement
 * @property Carbon $initie_le
 * @property Carbon|null $conclu_le
 * @property Carbon $expire_le
 * @property-read User $user
 * @property-read Abonnement|null $abonnement
 */
#[Fillable(['uuid', 'user_id', 'beneficiaire_id', 'formule', 'montant_gnf', 'moyen', 'passerelle', 'numero_payeur', 'numero_fin', 'reference_operateur', 'statut', 'motif_echec', 'url_paiement', 'initie_le', 'conclu_le', 'expire_le'])]
#[Hidden(['numero_payeur'])]
class Paiement extends Model
{
    protected function casts(): array
    {
        return [
            'formule' => FormuleAbonnement::class,
            'moyen' => MoyenPaiement::class,
            'statut' => StatutPaiement::class,
            'montant_gnf' => 'integer',
            'numero_payeur' => 'encrypted',
            'initie_le' => 'datetime',
            'conclu_le' => 'datetime',
            'expire_le' => 'datetime',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<User, $this> */
    public function beneficiaire(): BelongsTo
    {
        return $this->belongsTo(User::class, 'beneficiaire_id');
    }

    /** L'élève que ce paiement abonne : l'enfant d'un parent payeur, sinon le payeur. */
    public function eleveAbonne(): User
    {
        return $this->beneficiaire ?? $this->user;
    }

    /** @return HasOne<Abonnement, $this> */
    public function abonnement(): HasOne
    {
        return $this->hasOne(Abonnement::class);
    }

    /** « •• 42 » : assez pour reconnaître le payeur, rien de plus. */
    public function numeroMasque(): string
    {
        return '••• ••• '.$this->numero_fin;
    }
}
