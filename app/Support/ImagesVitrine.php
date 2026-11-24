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
 *   Facultative. Présente, elle **remplace** l'illustration du héros
 *   (détourée sur une arche, 2026-11-24) ; absente, le héros montre
 *   l'illustration.
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

    /** Largeur de la petite version, servie aux téléphones. */
    public const LARGEUR_PETITE = 560;

    /**
     * Largeur affichée de la photo (attribut `sizes`) : 34rem au plus
     * (le visuel du héros), la largeur de l'écran moins ses marges sur
     * téléphone. Seule règle, lue par la page et par le préchargement.
     */
    public const TAILLES_PHOTO = '(min-width: 640px) 34rem, calc(100vw - 2rem)';

    /**
     * La photo du héros, avec ses dimensions (le navigateur réserve sa
     * place : rien ne bouge au chargement) et, si elle existe à côté, sa
     * petite version `<nom>-560.<ext>` pour les téléphones.
     *
     * @return array{src: string, srcset: string|null, tailles: string|null, largeur: int, hauteur: int}|null
     */
    public static function photoHeros(): ?array
    {
        $chemin = self::cheminValide(config('vitrine.photo_heros'));

        if ($chemin === null) {
            return null;
        }

        $taille = @getimagesize(public_path($chemin)) ?: [0, 0];
        $infos = pathinfo($chemin);
        $dossier = $infos['dirname'] ?? '.';
        $petite = self::cheminValide(
            ($dossier === '.' ? '' : $dossier.'/')
            .$infos['filename'].'-'.self::LARGEUR_PETITE.'.'.($infos['extension'] ?? 'webp'),
        );

        $srcset = $petite === null || $taille[0] <= self::LARGEUR_PETITE
            ? null
            : asset($petite).' '.self::LARGEUR_PETITE.'w, '.asset($chemin).' '.$taille[0].'w';

        return [
            'src' => asset($chemin),
            'srcset' => $srcset,
            'tailles' => $srcset === null ? null : self::TAILLES_PHOTO,
            'largeur' => (int) $taille[0],
            'hauteur' => (int) $taille[1],
        ];
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
