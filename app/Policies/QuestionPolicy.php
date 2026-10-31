<?php

namespace App\Policies;

use App\Models\Contracts\ContenuRelisable;
use App\Models\Question;
use App\Models\User;
use Illuminate\Auth\Access\Response;

/**
 * Qui fait quoi sur une question dans le back-office : le circuit de
 * relecture commun aux contenus. L'élève ne voit jamais une question par
 * une route : il la reçoit dans une séance, une leçon ou une annale
 * (CatalogueEleve).
 *
 * Une question d'annale se relit **avec son sujet** (SujetService) : pas de
 * relecture à part.
 */
class QuestionPolicy extends PolicyContenuRelisable
{
    public function relire(User $user, ContenuRelisable $contenu): Response
    {
        if ($contenu instanceof Question && $contenu->sujet_partie_id !== null) {
            return Response::deny('Cette question se relit avec son annale.');
        }

        return parent::relire($user, $contenu);
    }

    /** Envoyer seule en relecture : jamais une question d'annale. */
    public function soumettre(User $user, Question $question): Response
    {
        if ($question->sujet_partie_id !== null) {
            return Response::deny('Cette question part en relecture avec son annale.');
        }

        return $this->rediger($user, $question);
    }
}
