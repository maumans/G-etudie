<?php

namespace App\Models;

use App\Enums\StatutContenu;
use App\Models\Concerns\EstRelisable;
use App\Models\Contracts\ContenuRelisable;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
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
 * @property-read Notion $notion
 * @property-read User $auteur
 */
#[Fillable(['uuid', 'notion_id', 'titre', 'statut', 'auteur_id', 'brouillon', 'revision', 'version_publiee_id', 'publie_le', 'est_exemple'])]
class Lecon extends Model implements ContenuRelisable
{
    use EstRelisable;

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

    public function nomContenu(): string
    {
        return 'leçon';
    }

    public function instantane(): array
    {
        return ['titre' => $this->titre, 'blocs' => $this->brouillon];
    }

    public function erreurAvantRelecture(): ?string
    {
        return ($this->brouillon['content'] ?? []) === [] || trim($this->titre) === ''
            ? 'Une leçon vide ne part pas en relecture.'
            : null;
    }
}
