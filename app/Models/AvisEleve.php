<?php

namespace App\Models;

use App\Enums\ReponseAvis;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * « Ton avis » (lot 14, la plaquette : « test d'essai, critiques, prise en
 * compte »). Créé par App\Services\TerrainService::donnerAvis seulement,
 * par la file (`avis.donner`). Lu par la plateforme (Console › Terrain),
 * jamais par un établissement.
 *
 * @property int $id
 * @property string $uuid l'uuid de l'opération `avis.donner`
 * @property int $user_id
 * @property int|null $appareil_id
 * @property string $ecran
 * @property ReponseAvis $reponse
 * @property list<string> $etiquettes
 * @property string|null $commentaire
 * @property string|null $version_app
 * @property Carbon $donne_le
 * @property Carbon|null $traite_le
 * @property int|null $traite_par
 * @property string|null $decision
 * @property bool $est_exemple
 * @property-read User $eleve
 * @property-read User|null $traitant
 */
#[Fillable(['uuid', 'user_id', 'appareil_id', 'ecran', 'reponse', 'etiquettes', 'commentaire', 'version_app', 'donne_le', 'traite_le', 'traite_par', 'decision', 'est_exemple'])]
class AvisEleve extends Model
{
    protected $table = 'avis_eleves';

    protected function casts(): array
    {
        return [
            'reponse' => ReponseAvis::class,
            'etiquettes' => 'array',
            'donne_le' => 'datetime',
            'traite_le' => 'datetime',
            'est_exemple' => 'boolean',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function eleve(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /** @return BelongsTo<User, $this> */
    public function traitant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'traite_par');
    }
}
