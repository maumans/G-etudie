<?php

namespace App\Models;

use App\Enums\StatutContenu;
use App\Enums\TypeQuestion;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Une question (PLAN M5). Au lot 2, QCM à une réponse seulement (premier
 * exercice, séance du jour minimale) ; format vérifié par
 * App\Support\FormatQuestion. `version` : la version vue par l'élève, que
 * porte chaque tentative (HORS_LIGNE.md A.9 ; l'historique des versions
 * arrive au lot 3).
 *
 * @property int $id
 * @property string $uuid
 * @property int $notion_id
 * @property TypeQuestion $type
 * @property array<string, mixed> $enonce document de blocs
 * @property array{options: list<array{id: string, texte: string, latex?: string}>} $donnees
 * @property array{option: string} $reponse_attendue
 * @property array<string, mixed>|null $explication document de blocs
 * @property int $difficulte
 * @property StatutContenu $statut
 * @property int $version
 * @property bool $est_exemple
 * @property-read Notion $notion
 */
#[Fillable(['uuid', 'notion_id', 'type', 'enonce', 'donnees', 'reponse_attendue', 'explication', 'difficulte', 'statut', 'version', 'est_exemple'])]
class Question extends Model
{
    protected function casts(): array
    {
        return [
            'type' => TypeQuestion::class,
            'enonce' => 'array',
            'donnees' => 'array',
            'reponse_attendue' => 'array',
            'explication' => 'array',
            'difficulte' => 'integer',
            'statut' => StatutContenu::class,
            'version' => 'integer',
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
}
