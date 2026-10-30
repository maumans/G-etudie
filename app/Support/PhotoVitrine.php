<?php

namespace App\Support;

use Illuminate\Support\Facades\File;

/**
 * La photo du héros de la vitrine, fournie par Maurice (jeune Guinéen
 * majeur, autorisation écrite signée : DESIGN.md § 8). Tant que le fichier
 * n'est pas déposé dans `public/` au chemin de `config('vitrine.photo_heros')`,
 * la vitrine montre l'aperçu de l'application à sa place.
 */
class PhotoVitrine
{
    public static function url(): ?string
    {
        $chemin = config('vitrine.photo_heros');

        if (! is_string($chemin) || $chemin === '' || ! File::isFile(public_path($chemin))) {
            return null;
        }

        return asset($chemin);
    }
}
