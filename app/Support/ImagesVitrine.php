<?php

namespace App\Support;

use Illuminate\Support\Facades\File;

/**
 * Les images de la vitrine (DESIGN.md § 8), une seule autorité.
 *
 * - Les illustrations : chaque emplacement a son dessin par défaut, livré
 *   dans `public/images/vitrine/defaut/`. Maurice le remplace en déposant
 *   son image dans `public/` et en changeant son chemin dans
 *   `config/vitrine.php` ; un chemin qui ne mène à aucun fichier retombe sur
 *   le dessin par défaut, la vitrine n'a jamais de trou.
 * - La photo du héros : une personne majeure, autorisation écrite signée.
 *   Facultative ; absente, le héros montre l'illustration seule.
 */
class ImagesVitrine
{
    /** Les emplacements, dans l'ordre de la page. */
    public const EMPLACEMENTS = ['heros', 'cee', 'bepc', 'bac', 'soir'];

    /** @return array<string, string> emplacement => URL */
    public static function illustrations(): array
    {
        $illustrations = [];

        foreach (self::EMPLACEMENTS as $emplacement) {
            $illustrations[$emplacement] = asset(
                self::cheminValide(config("vitrine.illustrations.{$emplacement}"))
                    ?? "images/vitrine/defaut/{$emplacement}.svg",
            );
        }

        return $illustrations;
    }

    public static function photoHeros(): ?string
    {
        $chemin = self::cheminValide(config('vitrine.photo_heros'));

        return $chemin === null ? null : asset($chemin);
    }

    /**
     * Les partenaires réels (`config('vitrine.partenaires')`, lot 8) dont le
     * logo existe : un partenaire sans logo trouvé n'est pas montré (jamais
     * de cadre vide ni de logo inventé).
     *
     * @return list<array{nom: string, logo: string, url: string|null}>
     */
    public static function partenaires(): array
    {
        $partenaires = [];

        foreach ((array) config('vitrine.partenaires', []) as $partenaire) {
            $logo = self::cheminValide($partenaire['logo'] ?? null);
            $nom = $partenaire['nom'] ?? null;

            if ($logo !== null && is_string($nom) && $nom !== '') {
                $url = $partenaire['url'] ?? null;
                $partenaires[] = ['nom' => $nom, 'logo' => asset($logo), 'url' => is_string($url) && $url !== '' ? $url : null];
            }
        }

        return $partenaires;
    }

    /** Le chemin, s'il désigne un fichier de `public/`. */
    private static function cheminValide(mixed $chemin): ?string
    {
        if (! is_string($chemin) || $chemin === '' || ! File::isFile(public_path($chemin))) {
            return null;
        }

        return $chemin;
    }
}
