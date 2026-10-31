<?php

namespace App\Support;

use App\Enums\TypeQuestion;
use App\Models\Question;
use App\Models\VersionContenu;

/**
 * La question telle que l'appareil la reçoit (`QuestionEleve` de
 * `lib/contenu/questions.ts`) : une **version** figée, jamais le brouillon,
 * sauf dans l'aperçu du back-office. Même objet pour la séance, la
 * mini-question d'une leçon et, au lot 7, les packs.
 *
 * La bonne réponse en fait partie : l'appareil corrige pour répondre tout
 * de suite, le serveur recorrige (HORS_LIGNE.md A.6).
 *
 * Appariement et remise en ordre : les éléments sont **mélangés ici**, d'un
 * ordre stable tiré de l'identifiant de la question (le même pour tous et
 * hors ligne), jamais dans l'ordre de la réponse.
 */
class PresentationQuestion
{
    /**
     * @return array<string, mixed>|null `null` : jamais publiée
     */
    public static function publiee(Question $question): ?array
    {
        $version = $question->versionPubliee;

        return $version === null ? null : self::depuisVersion($question, $version);
    }

    /**
     * @return array<string, mixed>
     */
    public static function depuisVersion(Question $question, VersionContenu $version): array
    {
        return self::presenter($question, $version->blocs, $version->numero);
    }

    /**
     * Le brouillon, pour l'aperçu « comme l'élève la verra » (numéro 0).
     *
     * @return array<string, mixed>
     */
    public static function brouillon(Question $question): array
    {
        return self::presenter($question, $question->contenuDuBrouillon(), 0);
    }

    /**
     * @param  array<string, mixed>  $contenu  ce que fige une version (Question::contenuDuBrouillon)
     * @return array<string, mixed>
     */
    private static function presenter(Question $question, array $contenu, int $numero): array
    {
        $type = TypeQuestion::from($contenu['type']);
        $donnees = $contenu['donnees'];
        $matiere = $question->notion->chapitre->matiere;

        if ($type === TypeQuestion::Appariement && is_array($donnees['droite'] ?? null)) {
            $donnees['droite'] = self::melanger($question->uuid, $donnees['droite']);
        }

        if ($type === TypeQuestion::Ordre && is_array($donnees['elements'] ?? null)) {
            $donnees['elements'] = self::melanger($question->uuid, $donnees['elements'], $contenu['attendue']['ordre'] ?? []);
        }

        return [
            'uuid' => $question->uuid,
            'version' => $numero,
            'type' => $type->value,
            'enonce' => $contenu['enonce'],
            // Un objet, même vide : `[]` en PHP deviendrait une liste en JSON.
            'donnees' => (object) $donnees,
            'attendue' => (object) $contenu['attendue'],
            'indices' => $contenu['indices'] ?? [],
            'corrige' => $contenu['corrige'] ?? [],
            'est_exemple' => $question->est_exemple,
            'matiere' => $matiere->teinte->value,
            'matiere_nom' => $matiere->nom,
            'notion' => $question->notion->titre,
        ];
    }

    /**
     * Ordre stable, propre à la question ; jamais celui de la réponse attendue.
     *
     * @param  array<mixed>  $elements
     * @param  array<mixed>  $aEviter
     * @return list<mixed>
     */
    private static function melanger(string $graine, array $elements, array $aEviter = []): array
    {
        $elements = array_values($elements);
        $repere = fn (mixed $e): string => is_array($e) && is_string($e['id'] ?? null) ? $e['id'] : '';
        usort($elements, fn (mixed $a, mixed $b) => crc32($graine.'|'.$repere($a)) <=> crc32($graine.'|'.$repere($b)));

        if (count($elements) > 1 && array_map($repere, $elements) === $aEviter) {
            $elements[] = array_shift($elements);
        }

        return $elements;
    }
}
