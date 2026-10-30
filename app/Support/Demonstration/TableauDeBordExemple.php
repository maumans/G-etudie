<?php

namespace App\Support\Demonstration;

use Carbon\CarbonImmutable;

/**
 * Tableau de bord élève de démonstration (DEVBOOK point 9). Tant que les
 * cours, la jauge et la motivation n'existent pas (lots 1, 2 et 6), l'accueil
 * élève montre sa forme définitive avec ces données fictives, marquées
 * `est_exemple` : la page affiche le bandeau « EXEMPLE — contenu fictif »
 * (CLAUDE.md § 5). Aucun sujet, coefficient, durée d'épreuve ni date
 * d'examen : seulement des notions et des chiffres d'élève imaginaire.
 *
 * Quand le vrai contenu arrive, le contrôleur remplace cette source par les
 * services métier ; la forme des données, elle, ne change pas.
 */
class TableauDeBordExemple
{
    /** Jours de la semaine, du lundi au dimanche. */
    private const JOURS = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];

    /**
     * @return array<string, mixed>
     */
    public static function donnees(?CarbonImmutable $maintenant = null): array
    {
        $maintenant ??= CarbonImmutable::now();

        return [
            'est_exemple' => true,
            'examen' => 'BEPC',
            'jauge' => [
                'pourcentage' => 54,
                'matieres' => [
                    ['cle' => 'maths', 'maitrise' => 71],
                    ['cle' => 'physique', 'maitrise' => 38],
                    ['cle' => 'biologie', 'maitrise' => 58],
                    ['cle' => 'francais', 'maitrise' => 64],
                    ['cle' => 'histoire', 'maitrise' => 42],
                ],
            ],
            'seance' => [
                'duree_minutes' => 15,
                'questions' => 12,
                'matieres' => ['maths', 'physique'],
            ],
            'serie' => [
                'jours' => 6,
                'points' => 1240,
                'semaine' => self::semaine($maintenant),
            ],
            'progression' => [
                ['cle' => 'maths', 'notions_maitrisees' => 16, 'notions' => 30],
                ['cle' => 'physique', 'notions_maitrisees' => 9, 'notions' => 24],
                ['cle' => 'francais', 'notions_maitrisees' => 18, 'notions' => 25],
            ],
            'reprendre' => [
                [
                    'cle' => 'maths',
                    'chapitre' => 'Géométrie',
                    'lecon' => 'Le théorème de Pythagore',
                    'progression' => 60,
                    'minutes_restantes' => 8,
                ],
                [
                    'cle' => 'physique',
                    'chapitre' => 'Électricité',
                    'lecon' => 'La loi d\'Ohm',
                    'progression' => 25,
                    'minutes_restantes' => 14,
                ],
                [
                    'cle' => 'francais',
                    'chapitre' => 'Grammaire',
                    'lecon' => 'Les propositions subordonnées',
                    'progression' => 80,
                    'minutes_restantes' => 4,
                ],
            ],
            'defi' => [
                'titre' => 'Réussir 20 questions de géométrie',
                'fait' => 12,
                'objectif' => 20,
                'jours_restants' => 3,
            ],
            'reussites' => [
                ['titre' => 'Première séance', 'detail' => 'Ta toute première séance du jour', 'points' => 50, 'icone' => 'eclair'],
                ['titre' => 'Régulier', 'detail' => '7 jours de révision de suite', 'points' => 100, 'icone' => 'flamme'],
            ],
        ];
    }

    /**
     * La semaine en cours : faits avant aujourd'hui, avec le jour de grâce
     * le mercredi (PLAN M9 : les coupures de courant arrivent), aujourd'hui
     * en cours, la suite à venir.
     *
     * @return list<array{jour: string, etat: string}>
     */
    private static function semaine(CarbonImmutable $maintenant): array
    {
        $aujourdhui = $maintenant->dayOfWeekIso - 1;

        return array_map(fn (int $index) => [
            'jour' => self::JOURS[$index],
            'etat' => match (true) {
                $index === $aujourdhui => 'en_cours',
                $index > $aujourdhui => 'a_venir',
                $index === 2 => 'grace',
                default => 'fait',
            },
        ], range(0, 6));
    }
}
