<?php

namespace App\Support;

/**
 * Seule autorité côté serveur sur le format des blocs d'un contenu
 * (HORS_LIGNE.md A.4). Son jumeau `resources/js/lib/contenu/blocs.ts`
 * accepte et refuse exactement les mêmes documents : les deux sont testés sur
 * `tests/fixtures/blocs.json`.
 *
 * Le format est le JSON de l'éditeur (TipTap / ProseMirror), réduit à une
 * liste fermée de nœuds. L'élève ne charge jamais l'éditeur : le composant
 * `ContenuBlocs` sait afficher ce format, qu'il vienne du serveur ou d'un
 * pack hors ligne.
 *
 *   doc        → bloc*
 *   bloc       → paragraph | heading (2, 3) | bulletList | orderedList
 *                | formuleBloc | encadre
 *   encadre    → genre (a_retenir, methode, exemple, piege), bloc* sans encadre
 *   listItem   → paragraph, puis paragraph | bulletList | orderedList
 *   en ligne   → text (marques bold, italic) | hardBreak | formule
 */
class BlocsContenu
{
    public const GENRES_ENCADRE = ['a_retenir', 'methode', 'exemple', 'piege'];

    public const LONGUEUR_MAX_LATEX = 1000;

    public const POIDS_MAX_OCTETS = 100_000;

    public const PROFONDEUR_MAX = 8;

    private const BLOCS = ['paragraph', 'heading', 'bulletList', 'orderedList', 'formuleBloc', 'encadre'];

    private const MARQUES = ['bold', 'italic'];

    /**
     * Document vide, celui d'une leçon qu'on vient de créer.
     *
     * @return array{type: string, content: list<array<string, mixed>>}
     */
    public static function vide(): array
    {
        return ['type' => 'doc', 'content' => []];
    }

    /**
     * Rend `null` si le document est valide, sinon la première raison du refus.
     */
    public static function erreur(mixed $doc): ?string
    {
        if (! is_array($doc) || ($doc['type'] ?? null) !== 'doc') {
            return 'Le contenu doit être un document.';
        }

        $json = json_encode($doc, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        if ($json === false || strlen($json) > self::POIDS_MAX_OCTETS) {
            return 'Le contenu est trop long (100 Ko au plus).';
        }

        $cles = array_diff(array_keys($doc), ['type', 'content']);

        if ($cles !== []) {
            return 'Le document porte une propriété inconnue.';
        }

        return self::enfants($doc['content'] ?? [], self::BLOCS, 1, 'Le document');
    }

    public static function estValide(mixed $doc): bool
    {
        return self::erreur($doc) === null;
    }

    /**
     * Chiffres d'un document, pour les listes du back-office.
     *
     * @param  array<string, mixed>  $doc
     * @return array{mots: int, formules: int, encadres: int}
     */
    public static function resume(array $doc): array
    {
        $resume = ['mots' => 0, 'formules' => 0, 'encadres' => 0];

        $parcourir = function (array $noeud) use (&$parcourir, &$resume): void {
            match ($noeud['type'] ?? null) {
                'text' => $resume['mots'] += count(preg_split('/\s+/u', trim((string) ($noeud['text'] ?? '')), -1, PREG_SPLIT_NO_EMPTY) ?: []),
                'formule', 'formuleBloc' => $resume['formules']++,
                'encadre' => $resume['encadres']++,
                default => null,
            };

            foreach ($noeud['content'] ?? [] as $enfant) {
                if (is_array($enfant)) {
                    $parcourir($enfant);
                }
            }
        };

        $parcourir($doc);

        return $resume;
    }

    /**
     * Temps de lecture estimé d'un document, en minutes (180 mots par minute
     * pour un élève, une formule comptée comme dix mots), une minute au moins.
     *
     * @param  array<string, mixed>  $doc
     */
    public static function minutesDeLecture(array $doc): int
    {
        $resume = self::resume($doc);

        return max(1, (int) ceil(($resume['mots'] + 10 * $resume['formules']) / 180));
    }

    /**
     * @param  list<string>  $permis
     */
    private static function enfants(mixed $contenu, array $permis, int $profondeur, string $parent): ?string
    {
        if (! is_array($contenu) || ! array_is_list($contenu)) {
            return "{$parent} a un contenu mal formé.";
        }

        if ($profondeur > self::PROFONDEUR_MAX) {
            return 'Le contenu est trop imbriqué.';
        }

        foreach ($contenu as $noeud) {
            if (! is_array($noeud) || ! is_string($noeud['type'] ?? null)) {
                return "{$parent} contient un élément sans type.";
            }

            if (! in_array($noeud['type'], $permis, true)) {
                return "{$parent} ne peut pas contenir « {$noeud['type']} ».";
            }

            $erreur = self::noeud($noeud, $profondeur);

            if ($erreur !== null) {
                return $erreur;
            }
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $noeud
     */
    private static function noeud(array $noeud, int $profondeur): ?string
    {
        $type = $noeud['type'];
        $enLigne = ['text', 'hardBreak', 'formule'];

        return match ($type) {
            'paragraph' => self::cles($noeud, ['content'])
                ?? self::enfants($noeud['content'] ?? [], $enLigne, $profondeur + 1, 'Un paragraphe'),
            'heading' => self::cles($noeud, ['attrs', 'content'])
                ?? self::attributs($noeud, ['level' => fn ($v) => in_array($v, [2, 3], true)], 'Un titre est de niveau 2 ou 3.')
                ?? self::enfants($noeud['content'] ?? [], $enLigne, $profondeur + 1, 'Un titre'),
            'bulletList' => self::cles($noeud, ['content'])
                ?? self::liste($noeud, $profondeur),
            'orderedList' => self::cles($noeud, ['attrs', 'content'])
                ?? self::attributs($noeud, [
                    'start' => fn ($v) => is_int($v) && $v >= 1 && $v <= 999,
                    'type' => fn ($v) => $v === null,
                ], 'Une liste numérotée commence à 1 ou plus.', facultatifs: true)
                ?? self::liste($noeud, $profondeur),
            'listItem' => self::cles($noeud, ['content'])
                ?? self::elementDeListe($noeud, $profondeur),
            'formuleBloc', 'formule' => self::cles($noeud, ['attrs'])
                ?? self::latex($noeud),
            'encadre' => self::cles($noeud, ['attrs', 'content'])
                ?? self::attributs($noeud, ['genre' => fn ($v) => in_array($v, self::GENRES_ENCADRE, true)], 'Genre d\'encadré inconnu.')
                ?? self::enfantsNonVides($noeud, array_values(array_diff(self::BLOCS, ['encadre'])), $profondeur, 'Un encadré'),
            'text' => self::cles($noeud, ['text', 'marks'])
                ?? self::texte($noeud),
            'hardBreak' => self::cles($noeud, []),
            default => "Élément inconnu « {$type} ».",
        };
    }

    /**
     * @param  array<string, mixed>  $noeud
     * @param  list<string>  $permises
     */
    private static function cles(array $noeud, array $permises): ?string
    {
        $inconnues = array_diff(array_keys($noeud), ['type', ...$permises]);

        return $inconnues === [] ? null : "« {$noeud['type']} » porte une propriété inconnue.";
    }

    /**
     * @param  array<string, mixed>  $noeud
     * @param  array<string, callable(mixed): bool>  $regles
     */
    private static function attributs(array $noeud, array $regles, string $message, bool $facultatifs = false): ?string
    {
        $attrs = $noeud['attrs'] ?? ($facultatifs ? [] : null);

        if (! is_array($attrs) || ($attrs !== [] && array_is_list($attrs))) {
            return $message;
        }

        if (array_diff(array_keys($attrs), array_keys($regles)) !== []) {
            return $message;
        }

        foreach ($regles as $cle => $regle) {
            if (! array_key_exists($cle, $attrs)) {
                if ($facultatifs) {
                    continue;
                }

                return $message;
            }

            if (! $regle($attrs[$cle])) {
                return $message;
            }
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $noeud
     */
    private static function liste(array $noeud, int $profondeur): ?string
    {
        return self::enfantsNonVides($noeud, ['listItem'], $profondeur, 'Une liste');
    }

    /**
     * @param  array<string, mixed>  $noeud
     */
    private static function elementDeListe(array $noeud, int $profondeur): ?string
    {
        $contenu = $noeud['content'] ?? null;

        if (! is_array($contenu) || $contenu === [] || ($contenu[0]['type'] ?? null) !== 'paragraph') {
            return 'Un élément de liste commence par un paragraphe.';
        }

        return self::enfants($contenu, ['paragraph', 'bulletList', 'orderedList'], $profondeur + 1, 'Un élément de liste');
    }

    /**
     * @param  array<string, mixed>  $noeud
     * @param  list<string>  $permis
     */
    private static function enfantsNonVides(array $noeud, array $permis, int $profondeur, string $parent): ?string
    {
        if (! is_array($noeud['content'] ?? null) || $noeud['content'] === []) {
            return "{$parent} ne peut pas être vide.";
        }

        return self::enfants($noeud['content'], $permis, $profondeur + 1, $parent);
    }

    /**
     * @param  array<string, mixed>  $noeud
     */
    private static function latex(array $noeud): ?string
    {
        $erreur = self::attributs($noeud, ['latex' => fn ($v) => is_string($v)], 'Une formule a besoin de son code LaTeX.');

        if ($erreur !== null) {
            return $erreur;
        }

        $latex = $noeud['attrs']['latex'];

        if (trim($latex) === '') {
            return 'Une formule est vide.';
        }

        return mb_strlen($latex) > self::LONGUEUR_MAX_LATEX ? 'Une formule est trop longue (1 000 caractères au plus).' : null;
    }

    /**
     * @param  array<string, mixed>  $noeud
     */
    private static function texte(array $noeud): ?string
    {
        if (! is_string($noeud['text'] ?? null) || $noeud['text'] === '') {
            return 'Un texte est vide.';
        }

        $marques = $noeud['marks'] ?? [];

        if (! is_array($marques) || ! array_is_list($marques)) {
            return 'Mise en forme mal formée.';
        }

        foreach ($marques as $marque) {
            if (! is_array($marque) || array_diff(array_keys($marque), ['type']) !== [] || ! in_array($marque['type'] ?? null, self::MARQUES, true)) {
                return 'Seuls le gras et l\'italique sont permis.';
            }
        }

        return null;
    }
}
