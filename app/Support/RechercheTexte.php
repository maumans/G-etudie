<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Str;

/**
 * Recherche texte côté serveur (CLAUDE.md § 4) : **chaque mot** du terme doit
 * apparaître dans au moins une des colonnes ciblées. Une colonne peut
 * traverser une relation (`notion.chapitre.titre`). Les jokers `%` et `_`
 * tapés par l'utilisateur sont pris à la lettre.
 */
class RechercheTexte
{
    /**
     * @template TModele of \Illuminate\Database\Eloquent\Model
     *
     * @param  Builder<TModele>  $requete
     * @param  list<string>  $colonnes
     * @return Builder<TModele>
     */
    public static function appliquer(Builder $requete, ?string $terme, array $colonnes): Builder
    {
        foreach (self::mots($terme) as $mot) {
            $motif = '%'.self::echapper($mot).'%';

            // Chaque mot dans son propre groupe : le OU entre colonnes ne doit
            // jamais s'unir aux autres conditions de la requête (CLAUDE.md § 4).
            $requete->where(function (Builder $groupe) use ($colonnes, $motif) {
                foreach ($colonnes as $colonne) {
                    if (str_contains($colonne, '.')) {
                        $relation = Str::beforeLast($colonne, '.');
                        $champ = Str::afterLast($colonne, '.');
                        $groupe->orWhereHas($relation, fn (Builder $q) => $q->where($champ, 'like', $motif));
                    } else {
                        $groupe->orWhere($colonne, 'like', $motif);
                    }
                }
            });
        }

        return $requete;
    }

    /**
     * @return list<string>
     */
    public static function mots(?string $terme): array
    {
        return array_values(array_filter(
            preg_split('/\s+/u', trim((string) $terme)) ?: [],
            fn (string $mot) => $mot !== '',
        ));
    }

    public static function echapper(string $mot): string
    {
        return str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $mot);
    }
}
