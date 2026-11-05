<?php

namespace App\Services\Annales;

use App\Enums\TypeQuestion;
use App\Support\BlocsContenu;
use App\Support\FormatQuestion;
use App\Support\TexteEnBlocs;

/**
 * Une question proposée par l'extracteur (ExtracteurClaude::schema()) devient
 * une question au format de App\Support\FormatQuestion. Une proposition
 * incohérente pour son type (QCM à une option, nombre illisible…) devient
 * une **question ouverte** avec un barème minimal, et le dit : l'énoncé,
 * lui, n'est jamais perdu.
 */
class PropositionEnQuestion
{
    private const LETTRES = ['a', 'b', 'c', 'd', 'e', 'f'];

    /**
     * @param  array<string, mixed>  $proposition
     * @return array{type: TypeQuestion, enonce: array<string, mixed>, donnees: array<string, mixed>, attendue: array<string, mixed>, corrige: list<array{titre: string, blocs: array<string, mixed>}>, difficulte: int, avertissement: string|null}
     */
    public static function convertir(array $proposition): array
    {
        $enonce = TexteEnBlocs::convertir(self::texte($proposition['enonce'] ?? ''));

        if (BlocsContenu::erreur($enonce) !== null) {
            $enonce = ['type' => 'doc', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => mb_substr(self::texte($proposition['enonce'] ?? ''), 0, 5000) ?: '[illisible]']]]]];
        }

        $type = TypeQuestion::tryFrom((string) ($proposition['type'] ?? ''));
        $corrige = self::corrige($proposition['corrige'] ?? []);
        $difficulte = max(1, min(5, (int) ($proposition['difficulte'] ?? 2)));

        [$donnees, $attendue] = $type !== null && in_array($type->value, ExtracteurClaude::TYPES, true)
            ? self::reponse($type, $proposition)
            : [[], []];

        $avertissement = null;

        if ($type === null || FormatQuestion::erreur($type, $enonce, $donnees, $attendue) !== null) {
            $avertissement = $type === null || $type === TypeQuestion::Ouverte
                ? 'barème proposé incomplet, un critère par défaut a été mis'
                : 'réponse proposée incohérente pour une question « '.$type->libelle().' », passée en question ouverte';
            $type = TypeQuestion::Ouverte;
            $donnees = self::bareme($proposition['bareme'] ?? []) ?? ['bareme' => [['id' => 'c1', 'critere' => 'La réponse est conforme au corrigé.', 'points' => 2]]];
            $attendue = [];
        }

        return [
            'type' => $type,
            'enonce' => $enonce,
            'donnees' => $donnees,
            'attendue' => $attendue,
            'corrige' => $corrige,
            'difficulte' => $difficulte,
            'avertissement' => $avertissement,
        ];
    }

    /**
     * @param  array<string, mixed>  $p
     * @return array{0: array<string, mixed>, 1: array<string, mixed>}
     */
    private static function reponse(TypeQuestion $type, array $p): array
    {
        return match ($type) {
            TypeQuestion::QcmUne, TypeQuestion::QcmPlusieurs => self::qcm($type, $p),
            TypeQuestion::VraiFaux => [[], is_bool($p['vrai'] ?? null) ? ['valeur' => $p['vrai']] : []],
            TypeQuestion::Numerique => self::numerique($p),
            TypeQuestion::Courte => [[], ['acceptees' => array_values(array_slice(array_filter(array_map(
                fn (mixed $t) => mb_substr(trim(self::texte($t)), 0, FormatQuestion::ACCEPTEE_MAX),
                is_array($p['acceptees'] ?? null) ? $p['acceptees'] : [],
            ), fn (string $t) => $t !== ''), 0, 10))]],
            TypeQuestion::Ouverte => [self::bareme($p['bareme'] ?? []) ?? [], []],
            default => [[], []],
        };
    }

    /**
     * @param  array<string, mixed>  $p
     * @return array{0: array<string, mixed>, 1: array<string, mixed>}
     */
    private static function qcm(TypeQuestion $type, array $p): array
    {
        $textes = array_slice(is_array($p['options'] ?? null) ? array_values($p['options']) : [], 0, FormatQuestion::OPTIONS_MAX);
        $options = [];

        foreach ($textes as $rang => $texte) {
            $texte = trim(self::texte($texte));
            $option = ['id' => self::LETTRES[$rang], 'texte' => mb_substr($texte, 0, FormatQuestion::TEXTE_MAX)];

            // Une option qui n'est qu'une formule s'affiche en formule.
            if (preg_match('/^\$([^$]+)\$$/', $texte, $m) === 1) {
                $option = ['id' => self::LETTRES[$rang], 'texte' => '', 'latex' => trim($m[1])];
            }

            $options[] = $option;
        }

        $bonnes = array_values(array_unique(array_filter(
            is_array($p['bonnes_options'] ?? null) ? $p['bonnes_options'] : [],
            fn (mixed $rang) => is_int($rang) && isset($options[$rang]),
        )));
        $lettres = array_map(fn (int $rang) => self::LETTRES[$rang], $bonnes);

        $attendue = $type === TypeQuestion::QcmUne
            ? (count($lettres) === 1 ? ['option' => $lettres[0]] : [])
            : ['options' => $lettres];

        return [['options' => $options], $attendue];
    }

    /**
     * @param  array<string, mixed>  $p
     * @return array{0: array<string, mixed>, 1: array<string, mixed>}
     */
    private static function numerique(array $p): array
    {
        $valeur = self::nombre($p['valeur'] ?? null);
        $tolerance = self::nombre($p['tolerance'] ?? null) ?? 0;
        $unite = is_string($p['unite'] ?? null) && trim($p['unite']) !== '' ? mb_substr(trim($p['unite']), 0, 20) : null;

        return [
            $unite === null ? [] : ['unite' => $unite],
            $valeur === null ? [] : ['valeur' => $valeur, 'tolerance' => abs($tolerance), 'relative' => false],
        ];
    }

    private static function nombre(mixed $valeur): int|float|null
    {
        if (is_int($valeur) || is_float($valeur)) {
            return $valeur;
        }

        if (! is_string($valeur)) {
            return null;
        }

        $propre = str_replace([' ', "\u{00A0}", "\u{202F}", ','], ['', '', '', '.'], trim($valeur));

        if (! is_numeric($propre)) {
            return null;
        }

        return str_contains($propre, '.') || str_contains(strtolower($propre), 'e') ? (float) $propre : (int) $propre;
    }

    /**
     * @return array{bareme: list<array{id: string, critere: string, points: int}>}|null
     */
    private static function bareme(mixed $bareme): ?array
    {
        if (! is_array($bareme)) {
            return null;
        }

        $criteres = [];

        foreach (array_slice(array_values($bareme), 0, 8) as $rang => $critere) {
            // Un critère est du texte simple (lot 3) : pas de délimiteurs de
            // formule, qui s'afficheraient tels quels.
            $texte = is_array($critere) ? trim(str_replace('$', '', self::texte($critere['critere'] ?? ''))) : '';

            if (mb_strlen($texte) < 3) {
                continue;
            }

            $criteres[] = [
                'id' => 'c'.(count($criteres) + 1),
                'critere' => mb_substr($texte, 0, FormatQuestion::TEXTE_MAX),
                'points' => max(1, min(10, (int) ($critere['points'] ?? 1))),
            ];
        }

        return $criteres === [] ? null : ['bareme' => $criteres];
    }

    /**
     * @return list<array{titre: string, blocs: array<string, mixed>}>
     */
    private static function corrige(mixed $etapes): array
    {
        if (! is_array($etapes)) {
            return [];
        }

        $corrige = [];

        foreach (array_slice(array_values($etapes), 0, FormatQuestion::ETAPES_MAX) as $etape) {
            if (! is_array($etape)) {
                continue;
            }

            $blocs = TexteEnBlocs::convertir(self::texte($etape['texte'] ?? ''));

            if (($blocs['content'] ?? []) === [] || BlocsContenu::erreur($blocs) !== null) {
                continue;
            }

            $corrige[] = ['titre' => mb_substr(trim(self::texte($etape['titre'] ?? '')), 0, 120), 'blocs' => $blocs];
        }

        return $corrige;
    }

    private static function texte(mixed $valeur): string
    {
        return is_string($valeur) ? $valeur : '';
    }
}
