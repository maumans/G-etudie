<?php

namespace App\Support;

/**
 * Du texte transcrit (import assisté, lot 4) au format des blocs
 * (App\Support\BlocsContenu) :
 *
 *  - une ligne vide sépare deux paragraphes ; un saut de ligne simple reste
 *    un saut de ligne ;
 *  - `$$…$$` seul sur sa ligne : formule centrée ; `$…$` : formule en ligne ;
 *  - des lignes qui commencent par « - » ou « • » : liste à puces ; par
 *    « 1. », « a) » : liste numérotée.
 *
 * Le résultat est toujours un document valide : une formule trop longue
 * reste du texte, un document trop lourd est coupé (et signalé par
 * l'appelant, qui vérifie avec BlocsContenu::erreur()).
 */
class TexteEnBlocs
{
    /**
     * @return array<string, mixed>
     */
    public static function convertir(string $texte): array
    {
        $texte = str_replace(["\r\n", "\r"], "\n", trim($texte));

        if ($texte === '') {
            return BlocsContenu::vide();
        }

        $blocs = [];

        foreach (preg_split('/\n\s*\n/', $texte) ?: [] as $paragraphe) {
            array_push($blocs, ...self::paragraphe(trim($paragraphe)));
        }

        return ['type' => 'doc', 'content' => $blocs];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private static function paragraphe(string $morceau): array
    {
        if ($morceau === '') {
            return [];
        }

        if (preg_match('/^\$\$(.+?)\$\$$/s', $morceau, $m) === 1 && self::latexAccepte($m[1])) {
            return [['type' => 'formuleBloc', 'attrs' => ['latex' => trim($m[1])]]];
        }

        $lignes = explode("\n", $morceau);

        if (self::toutes($lignes, '/^\s*[-•]\s+/')) {
            return [self::liste('bulletList', $lignes, '/^\s*[-•]\s+/')];
        }

        if (count($lignes) > 1 && self::toutes($lignes, '/^\s*(\d{1,3}[.)]|[a-h]\))\s+/')) {
            return [self::liste('orderedList', $lignes, '/^\s*(\d{1,3}[.)]|[a-h]\))\s+/')];
        }

        $contenu = [];

        foreach ($lignes as $rang => $ligne) {
            if ($rang > 0) {
                $contenu[] = ['type' => 'hardBreak'];
            }

            array_push($contenu, ...self::enLigne(rtrim($ligne)));
        }

        return $contenu === [] ? [] : [['type' => 'paragraph', 'content' => $contenu]];
    }

    /**
     * @param  list<string>  $lignes
     * @return array<string, mixed>
     */
    private static function liste(string $type, array $lignes, string $puce): array
    {
        $elements = array_map(fn (string $ligne) => [
            'type' => 'listItem',
            'content' => [['type' => 'paragraph', 'content' => self::enLigne(trim((string) preg_replace($puce, '', $ligne, 1))) ?: [['type' => 'text', 'text' => '…']]]],
        ], $lignes);

        return ['type' => $type, 'content' => $elements];
    }

    /**
     * Texte et formules en ligne.
     *
     * @return list<array<string, mixed>>
     */
    public static function enLigne(string $ligne): array
    {
        $noeuds = [];
        $morceaux = preg_split('/(\$[^$\n]+\$)/', $ligne, -1, PREG_SPLIT_DELIM_CAPTURE | PREG_SPLIT_NO_EMPTY) ?: [];

        foreach ($morceaux as $morceau) {
            if (strlen($morceau) > 2 && str_starts_with($morceau, '$') && str_ends_with($morceau, '$')
                && self::latexAccepte(substr($morceau, 1, -1))) {
                $noeuds[] = ['type' => 'formule', 'attrs' => ['latex' => trim(substr($morceau, 1, -1))]];

                continue;
            }

            $noeuds[] = ['type' => 'text', 'text' => $morceau];
        }

        return $noeuds;
    }

    /**
     * @param  list<string>  $lignes
     */
    private static function toutes(array $lignes, string $motif): bool
    {
        foreach ($lignes as $ligne) {
            if (preg_match($motif, $ligne) !== 1) {
                return false;
            }
        }

        return true;
    }

    private static function latexAccepte(string $latex): bool
    {
        return trim($latex) !== '' && mb_strlen($latex) <= BlocsContenu::LONGUEUR_MAX_LATEX;
    }
}
