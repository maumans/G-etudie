<?php

namespace App\Models;

use App\Enums\CibleSignalement;
use App\Enums\MotifSignalement;
use App\Enums\StatutSignalement;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * « Signaler une erreur » (PLAN M5, M17) : un élève signale une question, une
 * leçon ou une annale ; l'équipe répond une fois, l'élève lit la réponse.
 * Pas de fil de discussion (pas de messagerie libre, CLAUDE.md § 9).
 * Créé et traité par App\Services\SignalementService seulement.
 *
 * @property int $id
 * @property string $uuid l'uuid de l'opération `signalement.creer`
 * @property int $user_id
 * @property CibleSignalement $cible_type
 * @property int $cible_id
 * @property int|null $version
 * @property MotifSignalement $motif
 * @property string|null $message
 * @property StatutSignalement $statut
 * @property string|null $reponse
 * @property int|null $traite_par_id
 * @property Carbon|null $traite_le
 * @property Carbon|null $reponse_vue_le
 * @property Carbon $saisi_le
 * @property Carbon $recu_le
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read User $eleve
 * @property-read User|null $traitePar
 */
#[Fillable(['uuid', 'user_id', 'cible_type', 'cible_id', 'version', 'motif', 'message', 'statut', 'reponse', 'traite_par_id', 'traite_le', 'reponse_vue_le', 'saisi_le', 'recu_le'])]
class Signalement extends Model
{
    protected function casts(): array
    {
        return [
            'cible_type' => CibleSignalement::class,
            'version' => 'integer',
            'motif' => MotifSignalement::class,
            'statut' => StatutSignalement::class,
            'traite_le' => 'datetime',
            'reponse_vue_le' => 'datetime',
            'saisi_le' => 'datetime',
            'recu_le' => 'datetime',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    /** @return BelongsTo<User, $this> */
    public function eleve(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /** @return BelongsTo<User, $this> */
    public function traitePar(): BelongsTo
    {
        return $this->belongsTo(User::class, 'traite_par_id');
    }

    /** Le contenu signalé (`null` s'il a disparu depuis). */
    public function cible(): ?Model
    {
        $modele = $this->cible_type->modele();

        return $modele::query()->find($this->cible_id);
    }
}
