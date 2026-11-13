<?php

namespace App\Services\Tuteur;

/**
 * Ce qu'a coûté une réponse, en micro-dollars (PLAN M11 : « coût suivi dans
 * la console »), d'après les prix de `config('tuteur.prix')`. Un modèle sans
 * prix connu (le tuteur simulé) coûte 0.
 */
final class Couts
{
    public static function microUsd(ReponseMoteur $reponse): int
    {
        $prix = config('tuteur.prix.'.$reponse->modele);

        if (! is_array($prix)) {
            // L'API peut répondre avec un nom daté du même modèle.
            foreach ((array) config('tuteur.prix') as $modele => $tarif) {
                if (str_starts_with($reponse->modele, (string) $modele)) {
                    $prix = $tarif;
                    break;
                }
            }
        }

        if (! is_array($prix)) {
            return 0;
        }

        // Prix par million de jetons, en dollars = micro-dollars par jeton.
        return (int) round(
            $reponse->jetonsEntree * $prix['entree']
            + $reponse->jetonsSortie * $prix['sortie']
            + $reponse->jetonsCacheLus * $prix['cache_lu']
            + $reponse->jetonsCacheEcrits * $prix['cache_ecrit']
        );
    }
}
