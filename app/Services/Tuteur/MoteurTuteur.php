<?php

namespace App\Services\Tuteur;

use Closure;

/**
 * Qui écrit les explications (PLAN § 8 : « IA derrière un service ») :
 * TuteurClaude (l'API Claude), ou TuteurSimule (sans réseau, pour le
 * développement et les tests). Choisi par `config('tuteur.moteur')`.
 */
interface MoteurTuteur
{
    /**
     * Écrit la réponse en flux : `$surTexte` reçoit chaque morceau dès qu'il
     * arrive.
     *
     * @param  Closure(string): void  $surTexte
     *
     * @throws TuteurIndisponible quand la réponse ne peut pas être écrite
     */
    public function repondre(RequeteTuteur $requete, Closure $surTexte): ReponseMoteur;
}
