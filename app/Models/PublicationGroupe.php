<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * Une question (sans `parent_id`) ou une réponse du fil d'un groupe (lot 12,
 * PLAN M13). Publiée tout de suite, filtrée à l'envoi
 * (App\Services\Communaute\FilGroupeService) ; masquée en un geste par
 * l'enseignant, ou provisoirement après trois signalements d'élèves
 * différents (`masquage` = `enseignant` | `signalements`).
 *
 * @property int $id
 * @property string $uuid
 * @property int $groupe_id
 * @property int $auteur_id
 * @property int|null $parent_id
 * @property int|null $matiere_id
 * @property string $texte
 * @property Carbon|null $masquee_le
 * @property int|null $masquee_par
 * @property string|null $masquage
 * @property Carbon|null $signalements_vus_le l'enseignant a gardé la publication malgré ses signalements
 * @property bool $est_exemple
 * @property Carbon $created_at
 * @property-read Groupe $groupe
 * @property-read User $auteur
 * @property-read Matiere|null $matiere
 */
#[Fillable(['uuid', 'groupe_id', 'auteur_id', 'parent_id', 'matiere_id', 'texte', 'masquee_le', 'masquee_par', 'masquage', 'signalements_vus_le', 'est_exemple'])]
class PublicationGroupe extends Model
{
    public const MASQUAGE_ENSEIGNANT = 'enseignant';

    public const MASQUAGE_SIGNALEMENTS = 'signalements';

    protected $table = 'publications_groupe';

    protected function casts(): array
    {
        return [
            'masquee_le' => 'datetime',
            'signalements_vus_le' => 'datetime',
            'est_exemple' => 'boolean',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    /** @param Builder<PublicationGroupe> $requete */
    public function scopeVisibles(Builder $requete): void
    {
        $requete->whereNull('masquee_le');
    }

    /** @return BelongsTo<Groupe, $this> */
    public function groupe(): BelongsTo
    {
        return $this->belongsTo(Groupe::class);
    }

    /** @return BelongsTo<User, $this> */
    public function auteur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'auteur_id');
    }

    /** @return BelongsTo<Matiere, $this> */
    public function matiere(): BelongsTo
    {
        return $this->belongsTo(Matiere::class);
    }

    /** @return BelongsTo<PublicationGroupe, $this> */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    /** @return HasMany<PublicationGroupe, $this> */
    public function reponses(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id');
    }

    /** @return HasMany<SignalementPublication, $this> */
    public function signalements(): HasMany
    {
        return $this->hasMany(SignalementPublication::class, 'publication_id');
    }
}
