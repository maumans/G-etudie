<?php

namespace App\Support;

/**
 * Un document de blocs (App\Support\BlocsContenu) écrit en texte, formules
 * comprises (`$…$`, `$$…$$`) : ce que lit le tuteur (lot 10). Le chemin
 * inverse de App\Support\TexteEnBlocs, et la même écriture que celle que le
 * tuteur doit employer dans ses réponses.
 */
final class BlocsEnTexte
{
    /**
     * @param  array<string, mixed>|null  $doc
     */
    public static function convertir(?array $doc): string
    {
        if ($doc === null) {
            return '';
        }

        $blocs = array_map(self::bloc(...), array_filter($doc['content'] ?? [], 'is_array'));

        return trim(implode("\n\n", array_filter($blocs, fn (string $b) => $b !== '')));
    }

    /**
     * @param  array<string, mixed>  $noeud
     */
    private static function bloc(array $noeud, string $puce = ''): string
    {
        return match ($noeud['type'] ?? null) {
            'paragraph', 'heading' => self::enLigne($noeud),
            'formuleBloc' => '$$'.($noeud['attrs']['latex'] ?? '').'$$',
            'bulletList' => self::liste($noeud, false),
            'orderedList' => self::liste($noeud, true),
            'encadre' => self::convertir($noeud),
            // Une mini-question citée dans une leçon n'a pas sa place ici.
            default => '',
        };
    }

    /**
     * @param  array<string, mixed>  $noeud
     */
    private static function liste(array $noeud, bool $numerotee): string
    {
        $lignes = [];
        $rang = (int) ($noeud['attrs']['start'] ?? 1);

        foreach ($noeud['content'] ?? [] as $element) {
            if (! is_array($element)) {
                continue;
            }

            $texte = implode(' ', array_map(fn (array $enfant) => self::bloc($enfant), array_filter($element['content'] ?? [], 'is_array')));
            $lignes[] = ($numerotee ? ($rang++).'. ' : '- ').$texte;
        }

        return implode("\n", $lignes);
    }

    /**
     * @param  array<string, mixed>  $noeud
     */
    private static function enLigne(array $noeud): string
    {
        $texte = '';

        foreach ($noeud['content'] ?? [] as $enfant) {
            $texte .= match ($enfant['type'] ?? null) {
                'text' => (string) ($enfant['text'] ?? ''),
                'formule' => '$'.($enfant['attrs']['latex'] ?? '').'$',
                'hardBreak' => "\n",
                default => '',
            };
        }

        return trim($texte);
    }
}
