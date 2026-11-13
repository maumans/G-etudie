<?php

namespace Tests\Doubles;

use App\Services\Tuteur\MoteurTuteur;
use App\Services\Tuteur\ReponseMoteur;
use App\Services\Tuteur\RequeteTuteur;
use App\Services\Tuteur\TuteurIndisponible;
use Closure;

/**
 * Le moteur du tuteur pour les tests : garde chaque requête (ce qui serait
 * parti vers l'API) et rend les réponses qu'on lui a données, en morceaux.
 */
class TuteurEnMemoire implements MoteurTuteur
{
    /** @var list<RequeteTuteur> */
    public array $requetes = [];

    /** @var list<ReponseMoteur|TuteurIndisponible> */
    private array $file = [];

    public function repondAvec(string $texte, string $fin = 'complete', string $modele = 'claude-sonnet-5-5', int $entree = 1200, int $sortie = 300, int $cacheLus = 0): self
    {
        $this->file[] = new ReponseMoteur($texte, $fin, $modele, $entree, $sortie, $cacheLus);

        return $this;
    }

    public function tombeEnPanne(string $message = 'Le tuteur ne répond pas en ce moment. Réessaie dans un instant.'): self
    {
        $this->file[] = new TuteurIndisponible($message);

        return $this;
    }

    public function repondre(RequeteTuteur $requete, Closure $surTexte): ReponseMoteur
    {
        $this->requetes[] = $requete;
        $reponse = array_shift($this->file) ?? new ReponseMoteur('Explication par défaut du double.', 'complete', 'claude-sonnet-5-5', 1000, 200);

        if ($reponse instanceof TuteurIndisponible) {
            throw $reponse;
        }

        foreach (mb_str_split($reponse->texte, 5) as $morceau) {
            $surTexte($morceau);
        }

        return $reponse;
    }
}
