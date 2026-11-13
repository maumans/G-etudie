<?php

namespace App\Services\Tuteur;

/**
 * Ce que TuteurService envoie à un moteur : les consignes fixes, le
 * contexte de l'objet, et la conversation (la dernière entrée est la
 * demande de l'élève). Rien de personnel : `utilisateur` est une empreinte
 * opaque, qui sert seulement à l'API à repérer un abus.
 */
final readonly class RequeteTuteur
{
    /**
     * @param  list<array{role: 'user'|'assistant', content: string}>  $messages
     */
    public function __construct(
        public string $contexte,
        public array $messages,
        public string $utilisateur,
        public string $systeme = Consignes::SYSTEME,
    ) {}

    /** La dernière demande de l'élève (le moteur simulé y répond). */
    public function derniereDemande(): string
    {
        return $this->messages === [] ? '' : $this->messages[array_key_last($this->messages)]['content'];
    }
}
