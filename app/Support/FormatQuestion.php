<?php

namespace App\Support;

use App\Enums\TypeQuestion;
use Normalizer;

/**
 * Format et correction des questions (PLAN M5), pour les neuf types.
 *
 * | Type            | `donnees`                                   | `reponse_attendue`            | réponse de l'élève      |
 * |-----------------|---------------------------------------------|-------------------------------|-------------------------|
 * | `qcm_une`       | `{ options: [{ id: a…f, texte, latex? }] }` | `{ option }`                  | `{ option }`            |
 * | `qcm_plusieurs` | idem                                        | `{ options: [ids] }`          | `{ options: [ids] }`    |
 * | `vrai_faux`     | `{}`                                        | `{ valeur: bool }`            | `{ valeur: bool }`      |
 * | `numerique`     | `{ unite? }`                                | `{ valeur, tolerance, relative }` | `{ valeur: "3,14" }` |
 * | `courte`        | `{}`                                        | `{ acceptees: [textes] }`     | `{ texte }`             |
 * | `trous`         | `{ segments: [{ texte } | { trou: t1…, choix? }] }` | `{ trous: { t1: [textes] } }` | `{ trous: { t1: texte } }` |
 * | `appariement`   | `{ gauche: [g1…], droite: [d1…] }`          | `{ paires: { g1: d2 } }`      | `{ paires }`            |
 * | `ordre`         | `{ elements: [e1…] }`                       | `{ ordre: [ids] }`            | `{ ordre }`             |
 * | `ouverte`       | `{ bareme: [{ id: c1…, critere, points }] }` | `{}`                         | `{ texte }`, puis `{ criteres }` |
 *
 * **Score** de 0 à 100 ; une réponse n'est juste qu'à 100. Les types à
 * plusieurs parties (QCM à plusieurs réponses, trous, appariement, ordre)
 * donnent un score partiel : « En partie juste ». La question ouverte n'a
 * pas de score avant l'auto-évaluation de l'élève (`null`).
 *
 * **La correction du serveur fait foi** (HORS_LIGNE.md A.6). L'appareil
 * corrige aussi, pour répondre tout de suite (`lib/contenu/questions.ts`) :
 * les deux lisent le même jeu d'exemples, `tests/fixtures/questions.json`.
 */
class FormatQuestion
{
    public const OPTIONS_MIN = 2;

    public const OPTIONS_MAX = 6;

    public const INDICES_MAX = 3;

    public const ETAPES_MAX = 10;

    public const TEXTE_MAX = 300;

    public const ACCEPTEE_MAX = 100;

    public const REDACTION_MAX = 4000;

    /**
     * Première erreur du couple (données, réponse attendue), ou `null`.
     *
     * @param  array<string, mixed>  $enonce
     * @param  array<string, mixed>  $donnees
     * @param  array<string, mixed>  $attendue
     */
    public static function erreur(TypeQuestion $type, array $enonce, array $donnees, array $attendue): ?string
    {
        if (! BlocsContenu::estValide($enonce)) {
            return 'L\'énoncé n\'est pas un document valide.';
        }

        if (BlocsContenu::questionsCitees($enonce) !== []) {
            return 'Un énoncé ne contient pas d\'autre question.';
        }

        return match ($type) {
            TypeQuestion::QcmUne => self::erreurQcm($donnees, $attendue, false),
            TypeQuestion::QcmPlusieurs => self::erreurQcm($donnees, $attendue, true),
            TypeQuestion::VraiFaux => is_bool($attendue['valeur'] ?? null) ? null : 'Dites si l\'affirmation est vraie ou fausse.',
            TypeQuestion::Numerique => self::erreurNumerique($donnees, $attendue),
            TypeQuestion::Courte => self::erreurAcceptees($attendue['acceptees'] ?? null, 'la réponse'),
            TypeQuestion::Trous => self::erreurTrous($donnees, $attendue),
            TypeQuestion::Appariement => self::erreurAppariement($donnees, $attendue),
            TypeQuestion::Ordre => self::erreurOrdre($donnees, $attendue),
            TypeQuestion::Ouverte => self::erreurBareme($donnees),
        };
    }

    /**
     * Indices (3 au plus, chacun un document non vide) et corrigé pas à pas
     * (10 étapes au plus, chacune un titre facultatif et un document non vide).
     *
     * @param  array<mixed>  $indices
     * @param  array<mixed>  $corrige
     */
    public static function erreurAides(array $indices, array $corrige): ?string
    {
        if (! array_is_list($indices) || count($indices) > self::INDICES_MAX) {
            return 'Trois indices au plus.';
        }

        foreach ($indices as $indice) {
            if (! self::documentNonVide($indice)) {
                return 'Un indice est vide ou mal formé.';
            }
        }

        if (! array_is_list($corrige) || count($corrige) > self::ETAPES_MAX) {
            return 'Le corrigé a dix étapes au plus.';
        }

        foreach ($corrige as $etape) {
            if (! is_array($etape) || array_diff(array_keys($etape), ['titre', 'blocs']) !== []
                || ! is_string($etape['titre'] ?? null) || mb_strlen($etape['titre']) > 120) {
                return 'Une étape du corrigé est mal formée (titre de 120 caractères au plus).';
            }

            if (! self::documentNonVide($etape['blocs'] ?? null)) {
                return 'Une étape du corrigé est vide.';
            }
        }

        return null;
    }

    /**
     * Score de 0 à 100. Une réponse mal formée vaut 0, jamais une erreur.
     * `null` : question ouverte, en attente de l'auto-évaluation de l'élève.
     *
     * @param  array<string, mixed>  $attendue
     * @param  array<string, mixed>  $reponse
     */
    public static function corriger(TypeQuestion $type, array $attendue, array $reponse): ?int
    {
        return match ($type) {
            TypeQuestion::QcmUne => self::tout(is_string($reponse['option'] ?? null) && $reponse['option'] === ($attendue['option'] ?? null)),
            TypeQuestion::QcmPlusieurs => self::scoreQcmPlusieurs($attendue, $reponse),
            TypeQuestion::VraiFaux => self::tout(is_bool($reponse['valeur'] ?? null) && $reponse['valeur'] === ($attendue['valeur'] ?? null)),
            TypeQuestion::Numerique => self::tout(self::nombreJuste($attendue, $reponse['valeur'] ?? null)),
            TypeQuestion::Courte => self::tout(self::texteAccepte($reponse['texte'] ?? null, $attendue['acceptees'] ?? [])),
            TypeQuestion::Trous => self::scoreTrous($attendue, $reponse),
            TypeQuestion::Appariement => self::scoreAppariement($attendue, $reponse),
            TypeQuestion::Ordre => self::scoreOrdre($attendue, $reponse),
            TypeQuestion::Ouverte => null,
        };
    }

    /**
     * Auto-évaluation d'une question ouverte : la part des points des
     * critères que l'élève dit avoir remplis. Un critère inconnu ne compte pas.
     *
     * @param  array<string, mixed>  $donnees
     * @param  list<mixed>  $criteres
     */
    public static function scoreAutoEvaluation(array $donnees, array $criteres): int
    {
        $total = 0;
        $obtenus = 0;
        $coches = array_values(array_unique(array_filter($criteres, 'is_string')));

        foreach ($donnees['bareme'] ?? [] as $critere) {
            $total += (int) $critere['points'];

            if (in_array($critere['id'], $coches, true)) {
                $obtenus += (int) $critere['points'];
            }
        }

        return $total === 0 ? 0 : intdiv(100 * $obtenus, $total);
    }

    /**
     * Forme comparable d'une réponse écrite : sans accents, sans casse, sans
     * ponctuation, espaces réduits (« L’Été ! » → « l ete »).
     */
    public static function normaliserTexte(string $texte): string
    {
        $texte = (string) Normalizer::normalize($texte, Normalizer::FORM_D);
        $texte = (string) preg_replace('/\p{Mn}/u', '', $texte);
        $texte = str_replace(['œ', 'æ'], ['oe', 'ae'], mb_strtolower($texte));

        return trim((string) preg_replace('/[^\p{L}\p{N}]+/u', ' ', $texte));
    }

    /**
     * Nombre tapé par l'élève : virgule ou point, espaces de milliers
     * permis (« 1 000,5 »). `null` si ce n'est pas un nombre.
     */
    public static function lireNombre(mixed $valeur): ?float
    {
        if (is_int($valeur) || is_float($valeur)) {
            return is_finite((float) $valeur) ? (float) $valeur : null;
        }

        if (! is_string($valeur) || mb_strlen($valeur) > 40) {
            return null;
        }

        $texte = str_replace(',', '.', (string) preg_replace('/[\s\x{00A0}\x{202F}]+/u', '', $valeur));

        return preg_match('/^[+-]?(\d+(\.\d*)?|\.\d+)$/', $texte) === 1 ? (float) $texte : null;
    }

    private static function tout(bool $juste): int
    {
        return $juste ? 100 : 0;
    }

    /**
     * @param  array<string, mixed>  $attendue
     * @param  array<string, mixed>  $reponse
     */
    private static function scoreQcmPlusieurs(array $attendue, array $reponse): int
    {
        $bonnes = $attendue['options'] ?? [];
        $choisies = $reponse['options'] ?? null;

        if (! is_array($choisies) || ! array_is_list($choisies) || $bonnes === []) {
            return 0;
        }

        $choisies = array_values(array_unique(array_filter($choisies, 'is_string')));
        $justes = count(array_intersect($choisies, $bonnes));
        $fausses = count($choisies) - $justes;

        return max(0, intdiv(100 * ($justes - $fausses), count($bonnes)));
    }

    /**
     * @param  array<string, mixed>  $attendue
     */
    private static function nombreJuste(array $attendue, mixed $valeur): bool
    {
        $nombre = self::lireNombre($valeur);
        $cible = $attendue['valeur'] ?? null;

        if ($nombre === null || (! is_int($cible) && ! is_float($cible))) {
            return false;
        }

        $cible = (float) $cible;
        $tolerance = (float) ($attendue['tolerance'] ?? 0);

        if (($attendue['relative'] ?? false) === true) {
            $tolerance = abs($cible) * $tolerance / 100;
        }

        // Marge d'arrondi des nombres à virgule (0,1 + 0,2 ≠ 0,3).
        return abs($nombre - $cible) <= $tolerance + 1e-9 * max(1, abs($cible));
    }

    private static function texteAccepte(mixed $texte, mixed $acceptees): bool
    {
        if (! is_string($texte) || ! is_array($acceptees)) {
            return false;
        }

        $saisi = self::normaliserTexte($texte);

        if ($saisi === '') {
            return false;
        }

        foreach ($acceptees as $acceptee) {
            if (is_string($acceptee) && self::normaliserTexte($acceptee) === $saisi) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  array<string, mixed>  $attendue
     * @param  array<string, mixed>  $reponse
     */
    private static function scoreTrous(array $attendue, array $reponse): int
    {
        $trous = $attendue['trous'] ?? [];
        $saisis = $reponse['trous'] ?? null;

        if (! is_array($saisis) || $trous === []) {
            return 0;
        }

        $justes = 0;

        foreach ($trous as $id => $acceptees) {
            if (self::texteAccepte($saisis[$id] ?? null, $acceptees)) {
                $justes++;
            }
        }

        return intdiv(100 * $justes, count($trous));
    }

    /**
     * @param  array<string, mixed>  $attendue
     * @param  array<string, mixed>  $reponse
     */
    private static function scoreAppariement(array $attendue, array $reponse): int
    {
        $paires = $attendue['paires'] ?? [];
        $donnees = $reponse['paires'] ?? null;

        if (! is_array($donnees) || $paires === []) {
            return 0;
        }

        $justes = 0;

        foreach ($paires as $gauche => $droite) {
            if (($donnees[$gauche] ?? null) === $droite) {
                $justes++;
            }
        }

        return intdiv(100 * $justes, count($paires));
    }

    /**
     * @param  array<string, mixed>  $attendue
     * @param  array<string, mixed>  $reponse
     */
    private static function scoreOrdre(array $attendue, array $reponse): int
    {
        $ordre = $attendue['ordre'] ?? [];
        $donne = $reponse['ordre'] ?? null;

        if (! is_array($donne) || ! array_is_list($donne) || $ordre === [] || count($donne) !== count($ordre)
            || count(array_filter($donne, 'is_string')) !== count($donne)) {
            return 0;
        }

        // Une réponse qui n'est pas une permutation des éléments ne vaut rien.
        $tries = $donne;
        $attendus = $ordre;
        sort($tries);
        sort($attendus);

        if ($tries !== $attendus) {
            return 0;
        }

        $justes = 0;

        foreach ($ordre as $rang => $id) {
            if ($donne[$rang] === $id) {
                $justes++;
            }
        }

        return intdiv(100 * $justes, count($ordre));
    }

    private static function documentNonVide(mixed $doc): bool
    {
        return BlocsContenu::estValide($doc) && ($doc['content'] ?? []) !== [] && BlocsContenu::questionsCitees($doc) === [];
    }

    /**
     * Une liste d'éléments `{ id, texte, latex? }` aux identifiants de la forme voulue.
     *
     * @return list<string>|string les identifiants, ou la raison du refus
     */
    private static function elements(mixed $liste, string $motif, int $min, int $max, string $nom): array|string
    {
        if (! is_array($liste) || ! array_is_list($liste) || count($liste) < $min || count($liste) > $max) {
            return "Il faut de {$min} à {$max} {$nom}.";
        }

        $ids = [];

        foreach ($liste as $element) {
            if (! is_array($element) || ! is_string($element['id'] ?? null) || preg_match($motif, $element['id']) !== 1
                || array_diff(array_keys($element), ['id', 'texte', 'latex']) !== []) {
                return "Un élément ({$nom}) est mal formé.";
            }

            if (! is_string($element['texte'] ?? null) || mb_strlen($element['texte']) > self::TEXTE_MAX
                || (trim($element['texte']) === '' && ! isset($element['latex']))) {
                return "Chaque élément ({$nom}) a un texte ou une formule (300 caractères au plus).";
            }

            if (isset($element['latex']) && (! is_string($element['latex']) || trim($element['latex']) === ''
                || mb_strlen($element['latex']) > BlocsContenu::LONGUEUR_MAX_LATEX)) {
                return "La formule d'un élément ({$nom}) est vide ou trop longue.";
            }

            $ids[] = $element['id'];
        }

        if (count(array_unique($ids)) !== count($ids)) {
            return "Deux éléments ({$nom}) ont le même repère.";
        }

        return $ids;
    }

    /**
     * @param  array<string, mixed>  $donnees
     * @param  array<string, mixed>  $attendue
     */
    private static function erreurQcm(array $donnees, array $attendue, bool $plusieurs): ?string
    {
        $options = $donnees['options'] ?? null;

        if (! is_array($options) || ! array_is_list($options)
            || count($options) < self::OPTIONS_MIN || count($options) > self::OPTIONS_MAX) {
            return 'Un QCM a de 2 à 6 options.';
        }

        $ids = [];

        foreach ($options as $option) {
            if (! is_array($option) || ! is_string($option['id'] ?? null) || preg_match('/^[a-f]$/', $option['id']) !== 1
                || array_diff(array_keys($option), ['id', 'texte', 'latex']) !== []) {
                return 'Chaque option a une lettre de a à f.';
            }

            if (! is_string($option['texte'] ?? null) || mb_strlen($option['texte']) > self::TEXTE_MAX
                || (trim($option['texte']) === '' && ! isset($option['latex']))) {
                return 'Chaque option a un texte ou une formule.';
            }

            if (isset($option['latex']) && (! is_string($option['latex']) || trim($option['latex']) === ''
                || mb_strlen($option['latex']) > BlocsContenu::LONGUEUR_MAX_LATEX)) {
                return 'La formule d\'une option est vide ou trop longue.';
            }

            $ids[] = $option['id'];
        }

        if (count(array_unique($ids)) !== count($ids)) {
            return 'Deux options ont la même lettre.';
        }

        if (! $plusieurs) {
            return in_array($attendue['option'] ?? null, $ids, true) ? null : 'La bonne réponse doit être l\'une des options.';
        }

        $bonnes = $attendue['options'] ?? null;

        if (! is_array($bonnes) || ! array_is_list($bonnes) || $bonnes === []
            || count(array_unique($bonnes)) !== count($bonnes) || array_diff($bonnes, $ids) !== []) {
            return 'Cochez au moins une bonne réponse parmi les options.';
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $donnees
     * @param  array<string, mixed>  $attendue
     */
    private static function erreurNumerique(array $donnees, array $attendue): ?string
    {
        $unite = $donnees['unite'] ?? null;

        if ($unite !== null && (! is_string($unite) || mb_strlen($unite) > 20)) {
            return 'L\'unité a 20 caractères au plus.';
        }

        if (! is_int($attendue['valeur'] ?? null) && ! is_float($attendue['valeur'] ?? null)) {
            return 'Donnez la valeur attendue.';
        }

        $tolerance = $attendue['tolerance'] ?? null;

        if ((! is_int($tolerance) && ! is_float($tolerance)) || $tolerance < 0) {
            return 'La tolérance est un nombre positif ou nul.';
        }

        if (! is_bool($attendue['relative'] ?? null)) {
            return 'Dites si la tolérance est en valeur ou en pourcentage.';
        }

        if ($attendue['relative'] && $tolerance > 50) {
            return 'Une tolérance en pourcentage ne dépasse pas 50 %.';
        }

        return null;
    }

    private static function erreurAcceptees(mixed $acceptees, string $nom): ?string
    {
        if (! is_array($acceptees) || ! array_is_list($acceptees) || $acceptees === [] || count($acceptees) > 10) {
            return "Donnez de 1 à 10 formes acceptées pour {$nom}.";
        }

        foreach ($acceptees as $acceptee) {
            if (! is_string($acceptee) || mb_strlen($acceptee) > self::ACCEPTEE_MAX || self::normaliserTexte($acceptee) === '') {
                return "Une forme acceptée pour {$nom} est vide ou trop longue (100 caractères au plus).";
            }
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $donnees
     * @param  array<string, mixed>  $attendue
     */
    private static function erreurTrous(array $donnees, array $attendue): ?string
    {
        $segments = $donnees['segments'] ?? null;

        if (! is_array($segments) || ! array_is_list($segments) || $segments === [] || count($segments) > 40) {
            return 'Le texte à trous est vide ou trop long.';
        }

        $trous = [];

        foreach ($segments as $segment) {
            if (! is_array($segment)) {
                return 'Un morceau du texte est mal formé.';
            }

            if (array_key_exists('texte', $segment)) {
                if (array_keys($segment) !== ['texte'] || ! is_string($segment['texte']) || $segment['texte'] === '' || mb_strlen($segment['texte']) > 500) {
                    return 'Un morceau du texte est vide ou trop long.';
                }

                continue;
            }

            if (! is_string($segment['trou'] ?? null) || preg_match('/^t([1-9]|10)$/', $segment['trou']) !== 1
                || array_diff(array_keys($segment), ['trou', 'choix']) !== []) {
                return 'Un trou est mal formé.';
            }

            if (isset($segment['choix'])) {
                $choix = $segment['choix'];

                if (! is_array($choix) || ! array_is_list($choix) || count($choix) < 2 || count($choix) > 6) {
                    return 'Une liste de choix a de 2 à 6 propositions.';
                }

                foreach ($choix as $proposition) {
                    if (! is_string($proposition) || trim($proposition) === '' || mb_strlen($proposition) > self::ACCEPTEE_MAX) {
                        return 'Une proposition de la liste est vide ou trop longue.';
                    }
                }
            }

            $trous[$segment['trou']] = $segment['choix'] ?? null;
        }

        $nombreTrous = count(array_filter($segments, fn (array $s) => isset($s['trou'])));

        if ($trous === []) {
            return 'Le texte a besoin d\'au moins un trou.';
        }

        if (count($trous) !== $nombreTrous) {
            return 'Deux trous ont le même repère.';
        }

        $reponses = $attendue['trous'] ?? null;

        if (! is_array($reponses) || array_is_list($reponses) && $reponses !== []
            || array_diff(array_keys($trous), array_keys($reponses)) !== [] || array_diff(array_keys($reponses), array_keys($trous)) !== []) {
            return 'Chaque trou a sa réponse, et seulement les trous.';
        }

        foreach ($trous as $id => $choix) {
            $erreur = self::erreurAcceptees($reponses[$id], "le trou {$id}");

            if ($erreur !== null) {
                return $erreur;
            }

            if ($choix !== null && array_diff($reponses[$id], $choix) !== []) {
                return "La réponse du trou {$id} doit être l'une de ses propositions.";
            }
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $donnees
     * @param  array<string, mixed>  $attendue
     */
    private static function erreurAppariement(array $donnees, array $attendue): ?string
    {
        $gauche = self::elements($donnees['gauche'] ?? null, '/^g[1-6]$/', 2, 6, 'éléments à gauche');

        if (is_string($gauche)) {
            return $gauche;
        }

        $droite = self::elements($donnees['droite'] ?? null, '/^d[1-8]$/', 2, 8, 'éléments à droite');

        if (is_string($droite)) {
            return $droite;
        }

        if (count($droite) < count($gauche)) {
            return 'Il faut au moins autant d\'éléments à droite qu\'à gauche.';
        }

        $paires = $attendue['paires'] ?? null;

        if (! is_array($paires) || array_is_list($paires) || array_diff($gauche, array_keys($paires)) !== [] || count($paires) !== count($gauche)) {
            return 'Chaque élément de gauche a son élément de droite.';
        }

        $cibles = array_values($paires);

        if (array_diff($cibles, $droite) !== [] || count(array_unique($cibles)) !== count($cibles)) {
            return 'Deux éléments de gauche ne vont pas avec le même élément de droite.';
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $donnees
     * @param  array<string, mixed>  $attendue
     */
    private static function erreurOrdre(array $donnees, array $attendue): ?string
    {
        $ids = self::elements($donnees['elements'] ?? null, '/^e[1-8]$/', 2, 8, 'éléments à ranger');

        if (is_string($ids)) {
            return $ids;
        }

        $ordre = $attendue['ordre'] ?? null;
        $tries = is_array($ordre) && array_is_list($ordre) ? $ordre : [];
        $attendus = $ids;
        sort($tries);
        sort($attendus);

        return $tries === $attendus ? null : 'Le bon ordre doit reprendre chaque élément une fois.';
    }

    /**
     * @param  array<string, mixed>  $donnees
     */
    private static function erreurBareme(array $donnees): ?string
    {
        $bareme = $donnees['bareme'] ?? null;

        if (! is_array($bareme) || ! array_is_list($bareme) || $bareme === [] || count($bareme) > 8) {
            return 'Le barème a de 1 à 8 critères.';
        }

        $ids = [];

        foreach ($bareme as $critere) {
            if (! is_array($critere) || array_diff(array_keys($critere), ['id', 'critere', 'points']) !== []
                || ! is_string($critere['id'] ?? null) || preg_match('/^c[1-8]$/', $critere['id']) !== 1) {
                return 'Un critère du barème est mal formé.';
            }

            if (! is_string($critere['critere'] ?? null) || mb_strlen(trim($critere['critere'])) < 3 || mb_strlen($critere['critere']) > self::TEXTE_MAX) {
                return 'Chaque critère se dit en une phrase (300 caractères au plus).';
            }

            if (! is_int($critere['points'] ?? null) || $critere['points'] < 1 || $critere['points'] > 10) {
                return 'Un critère vaut de 1 à 10 points.';
            }

            $ids[] = $critere['id'];
        }

        return count(array_unique($ids)) === count($ids) ? null : 'Deux critères ont le même repère.';
    }
}
