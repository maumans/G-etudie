<?php

namespace App\Services\Tuteur;

use App\Enums\DemandeTuteur;
use App\Models\ConversationTuteur;
use App\Models\User;
use Illuminate\Contracts\Cache\Lock;

/**
 * Une demande vérifiée, prête à être diffusée (TuteurService::preparer puis
 * ::diffuser). Tout ce qui peut être refusé l'a été avant : une fois le flux
 * ouvert, l'élève reçoit une réponse, un recentrage ou un message de panne.
 */
final class Preparation
{
    /**
     * @param  array<string, mixed>  $nouvelle  les champs de la conversation à créer (si `conversation` est nulle)
     * @param  list<array{role: 'user'|'assistant', content: string}>  $historique  la conversation jusqu'ici
     */
    public function __construct(
        public readonly User $eleve,
        public readonly ?ConversationTuteur $conversation,
        public readonly array $nouvelle,
        public readonly DemandeTuteur $demande,
        public readonly string $texteEleve,
        public readonly string $contexte,
        public readonly array $historique,
        public readonly ?string $cleCache,
        public readonly int $quotaRestant,
        public readonly Lock $verrou,
    ) {}
}
