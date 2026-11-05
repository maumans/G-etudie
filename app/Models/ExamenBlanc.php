<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Un examen blanc terminé (PLAN M7, HORS_LIGNE.md A.8). Passé sur
 * l'appareil, il n'arrive ici qu'à la fin, par `examen_blanc.terminer` ;
 * écrit par App\Services\ExamenBlancService seulement, jamais modifié.
 *
 * @property int $id
 * @property string $uuid créé sur l'appareil (v7), clé d'idempotence
 * @property int $user_id
 * @property int $sujet_id
 * @property int $version version de l'annale passée
 * @property string $mode `conditions_reelles`
 * @property int $duree_minutes
 * @property string $origine_duree `imprimee`, `epreuve` ou `choisie`
 * @property Carbon $commence_le
 * @property Carbon $termine_le
 * @property bool $temps_ecoule
 * @property string $note_sur_20
 * @property string|null $note_appareil
 * @property array{parties: list<array<string, mixed>>} $details
 * @property bool $horloge_suspecte
 * @property string|null $motif_horloge
 * @property Carbon $recu_le
 * @property Carbon $created_at
 * @property-read User $eleve
 * @property-read Sujet $sujet
 */
#[Fillable(['uuid', 'user_id', 'sujet_id', 'version', 'mode', 'duree_minutes', 'origine_duree', 'commence_le', 'termine_le', 'temps_ecoule', 'note_sur_20', 'note_appareil', 'details', 'horloge_suspecte', 'motif_horloge', 'recu_le'])]
class ExamenBlanc extends Model
{
    protected $table = 'examens_blancs';

    protected function casts(): array
    {
        return [
            'version' => 'integer',
            'duree_minutes' => 'integer',
            'commence_le' => 'datetime',
            'termine_le' => 'datetime',
            'temps_ecoule' => 'boolean',
            'note_sur_20' => 'decimal:2',
            'note_appareil' => 'decimal:2',
            'details' => 'array',
            'horloge_suspecte' => 'boolean',
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

    /** @return BelongsTo<Sujet, $this> */
    public function sujet(): BelongsTo
    {
        return $this->belongsTo(Sujet::class);
    }
}
