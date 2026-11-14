<?php

namespace App\Support;

/**
 * L'habillage (layout) d'une page Inertia, d'après son dossier — miroir de
 * `resources/js/lib/habillages.ts`, qui fait foi pour l'affichage. Ici, il
 * sert seulement à **précharger** le fichier de l'habillage dans le document
 * (`app.blade.php`), pour qu'il arrive avec la page au lieu d'être découvert
 * après le démarrage. Un même jeu d'exemples (`tests/fixtures/habillages.json`)
 * teste les deux.
 */
class Habillages
{
    public static function de(string $page): ?string
    {
        return match (true) {
            $page === 'erreur',
            str_starts_with($page, 'dev/'),
            $page === 'eleve/seance',
            $page === 'eleve/bienvenue' => null,
            str_starts_with($page, 'vitrine/') => 'vitrine',
            str_starts_with($page, 'eleve/') => 'eleve',
            str_starts_with($page, 'contenu/') => 'contenu',
            str_starts_with($page, 'console/') => 'console',
            // Lot 11.
            str_starts_with($page, 'parent/') => 'parent',
            str_starts_with($page, 'enseignant/') => 'enseignant',
            str_starts_with($page, 'etablissement/') => 'etablissement',
            str_starts_with($page, 'auth/') => 'connexion',
            str_starts_with($page, 'compte/') => 'compte',
            default => null,
        };
    }

    /**
     * La page est-elle construite par le serveur (SSR, lot 8) ? La vitrine
     * seulement : publique, lue par les moteurs et par WhatsApp, et mesurée
     * par Lighthouse. Les espaces connectés restent rendus par le navigateur :
     * ils dépendent de l'appareil (copies hors ligne, profils du téléphone,
     * HORS_LIGNE.md) et le service worker les sert hors connexion.
     */
    public static function renduServeur(string $page): bool
    {
        return self::de($page) === 'vitrine';
    }

    /**
     * Les fichiers à passer à `@vite` pour une page : l'application, la page,
     * et son habillage s'il en a un.
     *
     * @return list<string>
     */
    public static function fichiersVite(string $page): array
    {
        $fichiers = ['resources/css/app.css', 'resources/js/app.tsx', "resources/js/pages/{$page}.tsx"];
        $habillage = self::de($page);

        if ($habillage !== null) {
            $fichiers[] = "resources/js/layouts/{$habillage}-layout.tsx";
        }

        return $fichiers;
    }
}
