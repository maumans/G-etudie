<?php

namespace App\Models;

use App\Enums\DecisionRelecture;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Carbon;

/**
 * Une version figée d'un contenu, créée à chaque envoi en relecture
 * (historique complet, PLAN M17). Elle ne change plus ensuite, sauf pour
 * recevoir la décision du relecteur.
 *
 * @property int $id
 * @property string $contenu_type
 * @property int $contenu_id
 * @property int $numero
 * @property string $titre
 * @property array<string, mixed> $blocs
 * @property int $auteur_id
 * @property Carbon $soumise_le
 * @property DecisionRelecture|null $decision
 * @property int|null $decide_par_id
 * @property Carbon|null $decide_le
 * @property string|null $commentaire
 */
#[Fillable(['numero', 'titre', 'blocs', 'auteur_id', 'soumise_le', 'decision', 'decide_par_id', 'decide_le', 'commentaire'])]
class VersionContenu extends Model
{
    protected $table = 'versions_contenu';

    protected function casts(): array
    {
        return [
            'blocs' => 'array',
            'soumise_le' => 'datetime',
            'decision' => DecisionRelecture::class,
            'decide_le' => 'datetime',
        ];
    }

    /** @return MorphTo<Model, $this> */
    public function contenu(): MorphTo
    {
        return $this->morphTo();
    }

    /** @return BelongsTo<User, $this> */
    public function auteur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'auteur_id');
    }

    /** @return BelongsTo<User, $this> */
    public function decidePar(): BelongsTo
    {
        return $this->belongsTo(User::class, 'decide_par_id');
    }
}
