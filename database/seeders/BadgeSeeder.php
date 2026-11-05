<?php

namespace Database\Seeders;

use App\Models\Badge;
use Illuminate\Database\Seeder;

/**
 * Catalogue des badges (PLAN M9, lot 6) : un référentiel, semé à chaque
 * déploiement (idempotent). Ce n'est pas du contenu officiel : Maurice et
 * l'équipe peuvent changer noms, descriptions et points ici. La règle qui
 * accorde chaque badge vit dans App\Services\MotivationService::regles(),
 * sous la même clé ; un badge sans règle n'est jamais accordé.
 */
class BadgeSeeder extends Seeder
{
    /** @var list<array{cle: string, nom: string, description: string, icone: string, points: int}> */
    public const BADGES = [
        ['cle' => 'premier_exercice', 'nom' => 'Premier pas', 'description' => 'Ton premier exercice.', 'icone' => 'pas', 'points' => 10],
        ['cle' => 'premiere_seance', 'nom' => 'Séance bouclée', 'description' => 'Ta première séance du jour terminée.', 'icone' => 'seance', 'points' => 20],
        ['cle' => 'serie_3', 'nom' => 'Trois soirs', 'description' => '3 jours de suite.', 'icone' => 'flamme', 'points' => 15],
        ['cle' => 'serie_7', 'nom' => 'Une semaine', 'description' => '7 jours de suite.', 'icone' => 'flamme', 'points' => 30],
        ['cle' => 'serie_30', 'nom' => 'Un mois', 'description' => '30 jours de suite.', 'icone' => 'flamme', 'points' => 100],
        ['cle' => 'premiere_notion', 'nom' => 'Première notion', 'description' => 'Une notion maîtrisée à 80 % ou plus.', 'icone' => 'notion', 'points' => 20],
        ['cle' => 'dix_notions', 'nom' => 'Dix notions', 'description' => 'Dix notions maîtrisées.', 'icone' => 'notion', 'points' => 50],
        ['cle' => 'chapitre_maitrise', 'nom' => 'Chapitre bouclé', 'description' => 'Toutes les notions d’un chapitre maîtrisées.', 'icone' => 'chapitre', 'points' => 50],
        ['cle' => 'cent_reponses', 'nom' => 'Cent réponses', 'description' => '100 exercices faits.', 'icone' => 'cible', 'points' => 30],
        ['cle' => 'premier_examen_blanc', 'nom' => 'Premier examen blanc', 'description' => 'Un examen blanc en conditions réelles.', 'icone' => 'chrono', 'points' => 30],
        ['cle' => 'examen_blanc_moyenne', 'nom' => 'La moyenne', 'description' => '10/20 ou plus à un examen blanc.', 'icone' => 'trophee', 'points' => 40],
        ['cle' => 'defi_reussi', 'nom' => 'Défi relevé', 'description' => 'Un défi de la semaine réussi.', 'icone' => 'defi', 'points' => 20],
    ];

    public function run(): void
    {
        foreach (self::BADGES as $ordre => $badge) {
            Badge::query()->updateOrCreate(['cle' => $badge['cle']], [...$badge, 'ordre' => $ordre + 1]);
        }
    }
}
