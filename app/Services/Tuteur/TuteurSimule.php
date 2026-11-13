<?php

namespace App\Services\Tuteur;

use Closure;
use Illuminate\Support\Str;

/**
 * Le tuteur sans réseau (développement, tests, démonstration) : une
 * explication écrite d'avance, **marquée « EXEMPLE »**, diffusée mot à mot
 * comme le ferait l'API. Il imite aussi les deux marqueurs des consignes,
 * pour que le recentrage et le refus se voient et se testent sans clé :
 * une demande qui parle de football, de film ou de musique est « hors
 * sujet » ; une qui parle de drogue ou d'arme est « inadaptée ».
 *
 * Jamais en production (config/tuteur.php).
 */
class TuteurSimule implements MoteurTuteur
{
    public const MODELE = 'simule';

    private const HORS_SUJET = ['football', 'foot ', 'film', 'musique', 'chanteur', 'jeu vidéo', 'copine', 'copain'];

    private const INADAPTE = ['drogue', 'arme', 'alcool'];

    /** Pause entre deux mots, en microsecondes (0 en test). */
    public function __construct(private int $pauseMicrosecondes = 25_000) {}

    public function repondre(RequeteTuteur $requete, Closure $surTexte): ReponseMoteur
    {
        $texte = $this->texte($requete);
        $morceaux = preg_split('/(?<=\s)/u', $texte) ?: [$texte];

        foreach ($morceaux as $morceau) {
            $surTexte($morceau);

            if ($this->pauseMicrosecondes > 0) {
                usleep($this->pauseMicrosecondes);
            }
        }

        return new ReponseMoteur(
            texte: $texte,
            fin: 'complete',
            modele: self::MODELE,
            jetonsEntree: intdiv(mb_strlen($requete->systeme.$requete->contexte), 4),
            jetonsSortie: intdiv(mb_strlen($texte), 4),
        );
    }

    private function texte(RequeteTuteur $requete): string
    {
        $demande = Str::lower($requete->derniereDemande());

        if (Str::contains($demande, self::INADAPTE)) {
            return Consignes::INADAPTE;
        }

        if (Str::contains($demande, self::HORS_SUJET)) {
            return Consignes::HORS_SUJET.' Parlons plutôt de ta révision : pose-moi une question sur ton cours.';
        }

        if (Str::contains($demande, 'plus simple')) {
            return <<<'TXT'
                EXEMPLE — explication fictive du tuteur simulé.

                Plus simple encore : imagine un panier de mangues au marché de Madina. Si une mangue coûte $2\,000$ GNF, trois mangues coûtent $3 \times 2\,000 = 6\,000$ GNF. Ici, c'est la même idée : on répète la même opération autant de fois qu'il le faut.

                Tu veux essayer avec quatre mangues ?
                TXT;
        }

        if (Str::contains($demande, 'exemple')) {
            return <<<'TXT'
                EXEMPLE — explication fictive du tuteur simulé.

                Un autre exemple : un taxi-moto fait $12$ km entre deux quartiers de Conakry en $20$ minutes. Sa vitesse moyenne est

                $$v = \frac{12}{20} = 0{,}6 \text{ km par minute}$$

                soit $36$ km/h. On divise toujours la distance par le temps.

                À toi : quelle est la vitesse s'il met $30$ minutes ?
                TXT;
        }

        return <<<'TXT'
            EXEMPLE — explication fictive du tuteur simulé.

            Reprenons doucement. La question te demande d'appliquer une règle du cours à un cas précis. Le corrigé le fait en deux temps :

            1. On repère ce que l'énoncé donne, par exemple $a = 3$ et $b = 4$.
            2. On applique la règle : $c^2 = a^2 + b^2 = 9 + 16 = 25$, donc $c = 5$.

            Le piège, c'est d'additionner $a + b$ avant de mettre au carré : $3 + 4 = 7$, et $7^2 = 49$, ce qui est faux.

            Pour vérifier que tu as compris : que trouves-tu avec $a = 6$ et $b = 8$ ?
            TXT;
    }
}
