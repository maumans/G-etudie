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

    /** Le chemin, s'il désigne un fichier de `public/`. */
    private static function cheminValide(mixed $chemin): ?string
    {
        if (! is_string($chemin) || $chemin === '' || ! File::isFile(public_path($chemin))) {
            return null;
        }

        return $chemin;
    }
}
