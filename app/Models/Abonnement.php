<?php

namespace App\Models;

use App\Enums\FormuleAbonnement;
use App\Enums\SourceAbonnement;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Une période d'abonnement (PLAN M16). Créée par
 * App\Services\AbonnementService seulement. Un paiement ou un code n'en
 * crée qu'une (colonnes uniques) ; une nouvelle période commence à la fin de
 * celle en cours : l'élève ne perd aucun jour.
 *
 * @property int $id
 * @property int $user_id
 * @property FormuleAbonnement $formule
 * @property Carbon $debut
 * @property Carbon $fin
 * @property SourceAbonnement $source
 * @property int|null $paiement_id
 * @property int|null $code_acces_id
 * @property int|null $licence_id lot 11 : place d'une licence d'établissement
 * @property bool $est_exemple
 * @property-read User $user
 * @property-read Paiement|null $paiement
 */
#[Fillable(['user_id', 'formule', 'debut', 'fin', 'source', 'paiement_id', 'code_acces_id', 'licence_id', 'est_exemple'])]
class Abonnement extends Model
{
    protected function casts(): array
    {
        return [
            'formule' => FormuleAbonnement::class,
            'source' => SourceAbonnement::class,
            'debut' => 'datetime',
            'fin' => 'datetime',
            'est_exemple' => 'boolean',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<Paiement, $this> */
    public function paiement(): BelongsTo
    {
        return $this->belongsTo(Paiement::class);
    }
}
