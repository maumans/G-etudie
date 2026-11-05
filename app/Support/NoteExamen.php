<?php

namespace App\Support;

/**
 * La note d'un examen blanc sur 20 (PLAN M7) — **seule règle de calcul**,
 * jumelle de `noteExamen()` dans `resources/js/lib/examen-blanc/note.ts` :
 * les deux lisent `tests/fixtures/notes-examen.json`.
 *
 *  - une partie vaut son **barème imprimé** ; si une partie n'en a pas, toutes
 *    pèsent autant (on n'invente pas de barème) ;
 *  - dans une partie, chaque question pèse autant ; une question sans
 *    réponse, ou ouverte et pas auto-évaluée, vaut 0 ;
 *  - note = 20 × points obtenus / points possibles, arrondie au centième
 *    (arrondi « au plus proche », le même des deux côtés).
 */
class NoteExamen
{
    /**
     * @param  list<array{bareme: float|int|null, scores: list<int|null>}>  $parties  scores de 0 à 100
     * @return array{note: float, parties: list<array{points: float, sur: float}>}
     */
    public static function calculer(array $parties): array
    {
        $comptees = array_values(array_filter($parties, fn (array $p) => $p['scores'] !== []));
        $avecBareme = $comptees !== [] && array_reduce($comptees, fn (bool $tous, array $p) => $tous && is_numeric($p['bareme']) && $p['bareme'] > 0, true);

        $possibles = 0.0;
        $obtenus = 0.0;
        $details = [];

        foreach ($parties as $partie) {
            if ($partie['scores'] === []) {
                $details[] = ['points' => 0.0, 'sur' => 0.0];

                continue;
            }

            $poids = $avecBareme ? (float) $partie['bareme'] : 1.0;
            $part = array_sum(array_map(fn (?int $s) => max(0, min(100, $s ?? 0)), $partie['scores'])) / (100 * count($partie['scores']));

            $possibles += $poids;
            $obtenus += $poids * $part;
            $details[] = ['points' => self::arrondir($poids * $part), 'sur' => $poids];
        }

        return [
            'note' => $possibles > 0 ? self::arrondir(20 * $obtenus / $possibles) : 0.0,
            'parties' => $details,
        ];
    }

    /** Au centième le plus proche, à l'identique de l'appareil. */
    public static function arrondir(float $valeur): float
    {
        return floor($valeur * 100 + 0.5 + 1e-9) / 100;
    }
}
