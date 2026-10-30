<?php

namespace App\Models;

use App\Enums\DecisionRelecture;
use App\Enums\StatutContenu;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Carbon;

/**
 * Une leçon (PLAN M4) : une suite de blocs (App\Support\BlocsContenu),
 * rattachée à une notion. Le circuit (brouillon → relecture → publication)
 * ne passe que par App\Services\ContenuService ; aucun contrôleur ne change
 * `statut` lui-même.
 *
 * `brouillon` : la copie de travail. `version_publiee_id` : ce que voit
 * l'élève, qui reste en ligne pendant qu'un nouveau brouillon est en cours.
 *
 * @property int $id
 * @property string $uuid
 * @property int $notion_id
 * @property string $titre
 * @property StatutContenu $statut
 * @property int $auteur_id
 * @property array<string, mixed> $brouillon
 * @property int $revision
 * @property int|null $version_publiee_id
 * @property Carbon|null $publie_le
 * @property bool $est_exemple
 * @property Carbon $created_at
 * @property Carbon $updated_at
 */
#[Fillable(['uuid', 'notion_id', 'titre', 'statut', 'auteur_id', 'brouillon', 'revision', 'version_publiee_id', 'publie_le', 'est_exemple'])]
class Lecon extends Model
{
    protected function casts(): array
    {
        return [
            'statut' => StatutContenu::class,
            'brouillon' => 'array',
            'revision' => 'integer',
            'publie_le' => 'datetime',
            'est_exemple' => 'boolean',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    /** @return BelongsTo<Notion, $this> */
    public function notion(): BelongsTo
    {
        return $this->belongsTo(Notion::class);
    }

    /** @return BelongsTo<User, $this> */
    public function auteur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'auteur_id');
    }

    /** @return MorphMany<VersionContenu, $this> */
    public function versions(): MorphMany
    {
        return $this->morphMany(VersionContenu::class, 'contenu')->orderByDesc('numero');
    }

    /** @return BelongsTo<VersionContenu, $this> */
    public function versionPubliee(): BelongsTo
    {
        return $this->belongsTo(VersionContenu::class, 'version_publiee_id');
    }

    /** La version qui attend le relecteur (`null` hors relecture). */
    public function versionEnRelecture(): ?VersionContenu
    {
        if ($this->statut !== StatutContenu::EnRelecture) {
            return null;
        }

        return $this->versions()->whereNull('decision')->first();
    }

    /** Dernière version renvoyée, si c'est la dernière décision (pour afficher le commentaire). */
    public function dernierRenvoi(): ?VersionContenu
    {
        $derniere = $this->versions()->whereNotNull('decision')->first();

        return $derniere?->decision === DecisionRelecture::Renvoyee ? $derniere : null;
    }
}
