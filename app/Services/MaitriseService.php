<?php

namespace App\Services;

use App\Models\ProfilEleve;
use App\Models\Tentative;
use App\Support\CatalogueEleve;

/**
 * Seule autorité sur la jauge de préparation (HORS_LIGNE.md A.10 : jamais
 * recalculée en JavaScript).
 *
 * **Version du lot 2** : par matière, la part des questions publiées que
 * l'élève a réussies au moins une fois. La jauge « ne ment pas » (DESIGN.md
 * § 6.1) : rien de fait, 0 %. Moyenne pondérée par les coefficients quand
 * ils sont **tous** saisis, sinon simple (aucun coefficient inventé,
 * CLAUDE.md § 5). La maîtrise par notion et la révision espacée la
 * remplacent au lot 6, sans changer la forme renvoyée.
 */
class MaitriseService
{
    /**
     * @return array{pourcentage: int, matieres: list<array{cle: string, maitrise: int}>}
     */
    public function jauge(ProfilEleve $profil): array
    {
        $epreuves = CatalogueEleve::epreuves($profil);

        if ($epreuves->isEmpty()) {
            return ['pourcentage' => 0, 'matieres' => []];
        }

        $reussies = Tentative::query()
            ->where('user_id', $profil->user_id)
            ->where('correcte', true)
            ->distinct()
            ->pluck('question_id')
            ->all();

        $matieres = [];
        $somme = 0.0;
        $poids = 0.0;
        $tousCoefficients = $epreuves->every(fn ($epreuve) => $epreuve->coefficient !== null);

        foreach ($epreuves as $epreuve) {
            $questions = CatalogueEleve::questions($profil, $epreuve->matiere)->pluck('id');
            $maitrise = $questions->isEmpty()
                ? 0
                : (int) round(100 * $questions->intersect($reussies)->count() / $questions->count());

            $coefficient = $tousCoefficients ? (float) $epreuve->coefficient : 1.0;
            $somme += $maitrise * $coefficient;
            $poids += $coefficient;
            $matieres[] = ['cle' => $epreuve->matiere->teinte->value, 'maitrise' => $maitrise];
        }

        return [
            'pourcentage' => $poids > 0 ? (int) round($somme / $poids) : 0,
            'matieres' => $matieres,
        ];
    }
}
