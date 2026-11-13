<?php

namespace App\Models;

use App\Enums\ObjetTuteur;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * Une conversation avec le tuteur (lot 10, PLAN M11). Créée et prolongée
 * par App\Services\Tuteur\TuteurService seulement.
 *
 * @property int $id
 * @property string $uuid
 * @property int $user_id
 * @property ObjetTuteur $objet
 * @property int|null $question_id
 * @property int|null $version version de la question que l'élève avait sous les yeux
 * @property int|null $etape rang de l'étape du corrigé (à partir de 0)
 * @property int|null $matiere_id
 * @property int|null $notion_id
 * @property array<string, mixed>|null $reponse la réponse de l'élève à la question
 * @property string $titre
 * @property bool $est_exemple
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read int|null $reponses_count withCount (réponses du tuteur)
 * @property-read User $eleve
 * @property-read Question|null $question
 * @property-read Matiere|null $matiere
 * @property-read Notion|null $notion
 * @property-read Collection<int, MessageTuteur> $messages
 */
#[Table('conversations_tuteur')]
#[Fillable(['uuid', 'user_id', 'objet', 'question_id', 'version', 'etape', 'matiere_id', 'notion_id', 'reponse', 'titre', 'est_exemple'])]
class ConversationTuteur extends Model
{
    protected function casts(): array
    {
        return [
            'objet' => ObjetTuteur::class,
            'version' => 'integer',
            'etape' => 'integer',
            'reponse' => 'array',
            'est_exemple' => 'boolean',
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

    /** @return BelongsTo<Question, $this> */
    public function question(): BelongsTo
    {
        return $this->belongsTo(Question::class);
    }

    /** @return BelongsTo<Matiere, $this> */
    public function matiere(): BelongsTo
    {
        return $this->belongsTo(Matiere::class);
    }

    /** @return BelongsTo<Notion, $this> */
    public function notion(): BelongsTo
    {
        return $this->belongsTo(Notion::class);
    }

    /** @return HasMany<MessageTuteur, $this> */
    public function messages(): HasMany
    {
        return $this->hasMany(MessageTuteur::class, 'conversation_id')->orderBy('id');
    }
}
