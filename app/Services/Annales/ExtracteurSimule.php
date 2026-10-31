<?php

namespace App\Services\Annales;

use App\Models\ImportSujet;

/**
 * Extracteur sans réseau (développement, tests, démonstration) : il ne lit
 * pas le document et rend toujours le même petit sujet **fictif**, dans la
 * forme de ExtracteurClaude::schema(). Le sujet créé porte `est_exemple`
 * et le bandeau « EXEMPLE — contenu fictif » (CLAUDE.md § 5).
 *
 * Jamais choisi en production (config/annales.php).
 */
class ExtracteurSimule implements ExtracteurSujet
{
    public function extraire(ImportSujet $import, string $contenu, array $notions): ResultatExtraction
    {
        $notion = array_key_first($notions);
        $seconde = array_keys($notions)[1] ?? $notion;

        return new ResultatExtraction(
            proposition: [
                'titre' => "Sujet d'exemple — {$import->matiere->nom}, session {$import->session}",
                'duree_minutes' => null,
                'coefficient' => null,
                'avertissements' => ['Lecture simulée : aucun document n\'a été lu, ce sujet est fictif.'],
                'parties' => [
                    [
                        'titre' => 'Exercice 1',
                        'bareme' => 4,
                        'consigne' => 'On considère la fonction $f$ définie par $f(x) = 2x + 3$.',
                        'questions' => [
                            [
                                'enonce' => 'Calcule $f(4)$.',
                                'type' => 'numerique',
                                'options' => [],
                                'bonnes_options' => [],
                                'vrai' => null,
                                'valeur' => '11',
                                'unite' => null,
                                'tolerance' => '0',
                                'acceptees' => [],
                                'bareme' => [],
                                'corrige' => [
                                    ['titre' => 'Remplacer x par 4', 'texte' => '$f(4) = 2 \times 4 + 3$'],
                                    ['titre' => 'Calculer', 'texte' => '$f(4) = 8 + 3 = 11$'],
                                ],
                                'notion_id' => $notion,
                                'difficulte' => 1,
                            ],
                            [
                                'enonce' => 'La fonction $f$ est-elle croissante sur $\mathbb{R}$ ?',
                                'type' => 'vrai_faux',
                                'options' => [],
                                'bonnes_options' => [],
                                'vrai' => true,
                                'valeur' => null,
                                'unite' => null,
                                'tolerance' => null,
                                'acceptees' => [],
                                'bareme' => [],
                                'corrige' => [
                                    ['titre' => 'Le coefficient directeur', 'texte' => 'Le coefficient de $x$ vaut 2, qui est positif : $f$ est croissante.'],
                                ],
                                'notion_id' => $notion,
                                'difficulte' => 2,
                            ],
                        ],
                    ],
                    [
                        'titre' => 'Exercice 2',
                        'bareme' => 6,
                        'consigne' => 'Un triangle $ABC$ est rectangle en $A$, avec $AB = 3$ cm et $AC = 4$ cm.',
                        'questions' => [
                            [
                                'enonce' => 'Quelle est la longueur $BC$ ?',
                                'type' => 'qcm_une',
                                'options' => ['5 cm', '7 cm', '25 cm'],
                                'bonnes_options' => [0],
                                'vrai' => null,
                                'valeur' => null,
                                'unite' => null,
                                'tolerance' => null,
                                'acceptees' => [],
                                'bareme' => [],
                                'corrige' => [
                                    ['titre' => 'Théorème de Pythagore', 'texte' => '$BC^2 = AB^2 + AC^2 = 9 + 16 = 25$, donc $BC = 5$ cm.'],
                                ],
                                'notion_id' => $seconde,
                                'difficulte' => 2,
                            ],
                            [
                                'enonce' => 'Justifie que le triangle $ABC$ n\'est pas isocèle.',
                                'type' => 'ouverte',
                                'options' => [],
                                'bonnes_options' => [],
                                'vrai' => null,
                                'valeur' => null,
                                'unite' => null,
                                'tolerance' => null,
                                'acceptees' => [],
                                'bareme' => [
                                    ['critere' => 'Compare les trois longueurs du triangle.', 'points' => 2],
                                    ['critere' => 'Conclut qu\'aucun couple de côtés n\'a la même longueur.', 'points' => 2],
                                ],
                                'corrige' => [
                                    ['titre' => 'Les longueurs', 'texte' => '$AB = 3$ cm, $AC = 4$ cm et $BC = 5$ cm.'],
                                    ['titre' => 'Conclusion', 'texte' => 'Les trois longueurs sont différentes : le triangle n\'est pas isocèle.'],
                                ],
                                'notion_id' => $seconde,
                                'difficulte' => 2,
                            ],
                        ],
                    ],
                ],
            ],
            modele: null,
            estExemple: true,
        );
    }
}
