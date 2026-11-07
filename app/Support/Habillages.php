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
            str_starts_with($page, 'auth/') => 'connexion',
            str_starts_with($page, 'compte/') => 'compte',
            default => null,
        };
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
