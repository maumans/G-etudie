<?php

namespace App\Support;

use App\Enums\TypeQuestion;

/**
 * Format et correction des questions (PLAN M5). Au lot 2, un seul type :
 * le QCM à une réponse.
 *
 *  - `donnees`  : `{ options: [{ id: 'a', texte: '…', latex?: '…' }] }`,
 *    2 à 6 options, identifiants uniques (une lettre) ;
 *  - `reponse_attendue` : `{ option: 'b' }` ;
 *  - réponse de l'élève : `{ option: 'b' }`.
 *
 * **La correction du serveur fait foi** (HORS_LIGNE.md A.6). L'appareil
 * corrige aussi, pour répondre tout de suite (`lib/contenu/questions.ts`) :
 * les deux lisent le même jeu d'exemples, `tests/fixtures/questions.json`.
 */
class FormatQuestion
{
    public const OPTIONS_MIN = 2;

    public const OPTIONS_MAX = 6;

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

        return match ($type) {
            TypeQuestion::QcmUne => self::erreurQcm($donnees, $attendue),
        };
    }

    /**
     * Juste ou faux. Une réponse mal formée est fausse, jamais une erreur.
     *
     * @param  array<string, mixed>  $attendue
     * @param  array<string, mixed>  $reponse
     */
    public static function corriger(TypeQuestion $type, array $attendue, array $reponse): bool
    {
        return match ($type) {
            TypeQuestion::QcmUne => is_string($reponse['option'] ?? null)
                && ($reponse['option'] === ($attendue['option'] ?? null)),
        };
    }

    /**
     * @param  array<string, mixed>  $donnees
     * @param  array<string, mixed>  $attendue
     */
    private static function erreurQcm(array $donnees, array $attendue): ?string
    {
        $options = $donnees['options'] ?? null;

        if (! is_array($options) || ! array_is_list($options)
            || count($options) < self::OPTIONS_MIN || count($options) > self::OPTIONS_MAX) {
            return 'Un QCM a de 2 à 6 options.';
        }

        $ids = [];

        foreach ($options as $option) {
            if (! is_array($option) || ! is_string($option['id'] ?? null) || preg_match('/^[a-f]$/', $option['id']) !== 1) {
                return 'Chaque option a une lettre de a à f.';
            }

            if (! is_string($option['texte'] ?? null) || (trim($option['texte']) === '' && ! isset($option['latex']))) {
                return 'Chaque option a un texte ou une formule.';
            }

            if (isset($option['latex']) && (! is_string($option['latex']) || mb_strlen($option['latex']) > BlocsContenu::LONGUEUR_MAX_LATEX)) {
                return 'La formule d\'une option est trop longue.';
            }

            $ids[] = $option['id'];
        }

        if (count(array_unique($ids)) !== count($ids)) {
            return 'Deux options ont la même lettre.';
        }

        if (! in_array($attendue['option'] ?? null, $ids, true)) {
            return 'La bonne réponse doit être l\'une des options.';
        }

        return null;
    }
}
