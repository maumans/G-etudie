<?php

namespace App\Models;

use App\Enums\DemandeTuteur;
use App\Enums\MotifSignalementTuteur;
use App\Enums\StatutReponseTuteur;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Un message d'une conversation avec le tuteur : la demande de l'élève
 * (`role = eleve`), ou la réponse du tuteur (`role = tuteur`) avec ce
 * qu'elle a coûté (PLAN § 6 : « jetons consommés et coût »).
 *
 * @property int $id
 * @property string $uuid
 * @property int $conversation_id
 * @property int $user_id
 * @property string $role `eleve` ou `tuteur`
 * @property DemandeTuteur $demande
 * @property string $texte
 * @property StatutReponseTuteur|null $statut
 * @property string|null $modele
 * @property int $jetons_entree
 * @property int $jetons_sortie
 * @property int $jetons_cache_lus
 * @property int $jetons_cache_ecrits
 * @property int $cout_micro_usd
 * @property int|null $premier_mot_ms
 * @property int|null $duree_ms
 * @property bool $depuis_cache
 * @property bool $compte décompté du quota du jour
 * @property Carbon|null $signale_le
 * @property MotifSignalementTuteur|null $signale_motif
 * @property Carbon|null $signalement_classe_le
 * @property bool $est_exemple
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read ConversationTuteur $conversation
 */
#[Table('messages_tuteur')]
#[Fillable(['uuid', 'conversation_id', 'user_id', 'role', 'demande', 'texte', 'statut', 'modele', 'jetons_entree', 'jetons_sortie', 'jetons_cache_lus', 'jetons_cache_ecrits', 'cout_micro_usd', 'premier_mot_ms', 'duree_ms', 'depuis_cache', 'compte', 'signale_le', 'signale_motif', 'signalement_classe_le', 'est_exemple'])]
class MessageTuteur extends Model
{
    public const ELEVE = 'eleve';

    public const TUTEUR = 'tuteur';

    protected function casts(): array
    {
        return [
            'demande' => DemandeTuteur::class,
            'statut' => StatutReponseTuteur::class,
            'jetons_entree' => 'integer',
            'jetons_sortie' => 'integer',
            'jetons_cache_lus' => 'integer',
            'jetons_cache_ecrits' => 'integer',
            'cout_micro_usd' => 'integer',
            'premier_mot_ms' => 'integer',
            'duree_ms' => 'integer',
            'depuis_cache' => 'boolean',
            'compte' => 'boolean',
            'signale_le' => 'datetime',
            'signale_motif' => MotifSignalementTuteur::class,
            'signalement_classe_le' => 'datetime',
            'est_exemple' => 'boolean',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    /** @return BelongsTo<ConversationTuteur, $this> */
    public function conversation(): BelongsTo
    {
        return $this->belongsTo(ConversationTuteur::class, 'conversation_id');
    }
}
