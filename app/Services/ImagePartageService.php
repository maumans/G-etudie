<?php

namespace App\Services;

use App\Models\Sujet;
use App\Support\AnnalesPubliques;
use GdImage;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

/**
 * Les cartes de partage (Open Graph, 1200 × 630) que WhatsApp affiche sous
 * un lien (lot 8, PLAN M1 : « WhatsApp est le canal de diffusion
 * principal »). Dessinées par GD sur le serveur — un lecteur de lien ne
 * charge pas de JavaScript —, rangées sur le disque local et redessinées
 * seulement quand leur texte change.
 *
 * Mêmes couleurs que la carte d'examen blanc dessinée sur l'appareil
 * (`lib/examen-blanc/carte.ts`) : encre, crème, mandarine, soleil. Police :
 * Bricolage Grotesque (OFL), instances statiques dans `resources/fonts/`.
 */
class ImagePartageService
{
    /** Changer ce numéro redessine toutes les cartes (nouveau dessin). */
    private const VERSION_DESSIN = 2;

    private const LARGEUR = 1200;

    private const HAUTEUR = 630;

    /** @return string chemin absolu du PNG */
    public function generale(): string
    {
        return $this->carte('generale', [
            'surtitre' => 'Du CEE au Baccalauréat unique',
            'titre' => 'Tout pour réussir le CEE, le BEPC et le Bac.',
            'texte' => 'Cours, sujets corrigés, exercices et examens blancs, même hors connexion.',
        ]);
    }

    public function sujet(Sujet $sujet): string
    {
        return $this->carte('sujet-'.$sujet->slug, [
            'surtitre' => $sujet->est_exemple ? 'Exemple, contenu fictif' : 'Sujet du '.$sujet->libelleSession(),
            'titre' => AnnalesPubliques::titre($sujet),
            'texte' => 'L’énoncé complet, et le corrigé pas à pas pour les inscrits.',
        ]);
    }

    /**
     * @param  array{surtitre: string, titre: string, texte: string}  $textes
     */
    private function carte(string $nom, array $textes): string
    {
        $empreinte = substr(hash('xxh128', self::VERSION_DESSIN.json_encode($textes)), 0, 16);
        $chemin = "partage/{$nom}-{$empreinte}.png";
        $disque = Storage::disk('local');

        if (! $disque->exists($chemin)) {
            foreach ($disque->files('partage') as $ancien) {
                if (str_starts_with(basename($ancien), "{$nom}-")) {
                    $disque->delete($ancien);
                }
            }

            $disque->put($chemin, $this->dessiner($textes));
        }

        return $disque->path($chemin);
    }

    /**
     * @param  array{surtitre: string, titre: string, texte: string}  $textes
     */
    private function dessiner(array $textes): string
    {
        $image = imagecreatetruecolor(self::LARGEUR, self::HAUTEUR);

        if ($image === false) {
            throw new RuntimeException('GD ne peut pas créer l’image de partage.');
        }

        imagealphablending($image, true);
        imageantialias($image, true);

        $encre = $this->couleur($image, '17130f');
        $creme = $this->couleur($image, 'fdf8f1');
        $cremeDouce = $this->couleur($image, 'fdf8f1', 45);
        $mandarine = $this->couleur($image, 'f6641b');
        $soleil = $this->couleur($image, 'ffc21a');

        imagefilledrectangle($image, 0, 0, self::LARGEUR, self::HAUTEUR, $encre);

        // Le halo mandarine en haut à droite, en disques de plus en plus clairs.
        for ($rayon = 640; $rayon > 0; $rayon -= 6) {
            $alpha = (int) round(127 - (1 - $rayon / 640) * 14);
            imagefilledellipse($image, 1010, 120, $rayon * 2, $rayon * 2, $this->couleur($image, 'f6641b', $alpha));
        }

        // Le soleil couchant et ses cercles (motif du héros de la vitrine).
        imagesetthickness($image, 2);
        foreach ([250, 200, 150] as $i => $rayonCercle) {
            imageellipse($image, 1030, 470, $rayonCercle * 2, $rayonCercle * 2, $this->couleur($image, 'ffc21a', 60 + $i * 20));
        }
        imagefilledellipse($image, 1030, 470, 180, 180, $soleil);

        $regulier = $this->police('BricolageGrotesque-Regular.ttf');
        $gras = $this->police('BricolageGrotesque-Bold.ttf');

        imagettftext($image, 34, 0, 80, 110, $creme, $gras, 'N’karamögö');
        imagefilledrectangle($image, 80, 140, 150, 146, $mandarine);
        imagettftext($image, 24, 0, 80, 205, $cremeDouce, $regulier, $textes['surtitre']);

        $titre = $this->couper($textes['titre'], $gras, 52, 740);
        $texte = $this->couper($textes['texte'], $regulier, 25, 700, 2);
        // Le bloc est posé depuis le bas (marge de 70 px) : un titre de trois
        // lignes ne pousse jamais le texte hors de la carte.
        $y = self::HAUTEUR - 70 - (count($texte) - 1) * 38 - 30 - count($titre) * 66;

        foreach ($titre as $ligne) {
            $y += 66;
            imagettftext($image, 52, 0, 80, $y, $creme, $gras, $ligne);
        }

        $y += 30;

        foreach ($texte as $ligne) {
            $y += 38;
            imagettftext($image, 25, 0, 80, $y, $cremeDouce, $regulier, $ligne);
        }

        ob_start();
        imagepng($image, null, 9);
        $png = (string) ob_get_clean();
        imagedestroy($image);

        return $png;
    }

    /**
     * Couper un texte en lignes d'au plus `$largeur` pixels (trois au plus,
     * la dernière finit par « … » si le texte est trop long).
     *
     * @return list<string>
     */
    private function couper(string $texte, string $police, int $taille, int $largeur, int $maximum = 3): array
    {
        $lignes = [];
        $courante = '';

        foreach (preg_split('/\s+/u', trim($texte)) ?: [] as $mot) {
            $essai = $courante === '' ? $mot : "{$courante} {$mot}";
            $boite = imagettfbbox($taille, 0, $police, $essai);

            if ($boite !== false && $largeur < $boite[2] - $boite[0] && $courante !== '') {
                $lignes[] = $courante;
                $courante = $mot;
            } else {
                $courante = $essai;
            }
        }

        if ($courante !== '') {
            $lignes[] = $courante;
        }

        if (count($lignes) > $maximum) {
            $lignes = [...array_slice($lignes, 0, $maximum - 1), $lignes[$maximum - 1].' …'];
        }

        return $lignes;
    }

    /**
     * Le chemin de la police. FreeType (sous Windows) n'ouvre pas un chemin
     * qui contient des caractères non ASCII — c'est le cas du dossier du
     * projet sur le poste de développement (« N’KARAMÖGÖ ») : la police est
     * alors copiée une fois dans le dossier temporaire.
     */
    private function police(string $fichier): string
    {
        $chemin = resource_path("fonts/{$fichier}");

        if (preg_match('/^[ -~]+$/', $chemin) === 1) {
            return $chemin;
        }

        $copie = sys_get_temp_dir().DIRECTORY_SEPARATOR.'nkaramogo-'.$fichier;

        if (! is_file($copie) || filesize($copie) !== filesize($chemin)) {
            copy($chemin, $copie);
        }

        return $copie;
    }

    /** @param  int  $alpha  0 opaque … 127 transparent (convention GD) */
    private function couleur(GdImage $image, string $hex, int $alpha = 0): int
    {
        $canaux = array_map(
            fn (int $decalage): int => max(0, min(255, (int) hexdec(substr($hex, $decalage, 2)))),
            [0, 2, 4],
        );

        return (int) imagecolorallocatealpha($image, $canaux[0], $canaux[1], $canaux[2], max(0, min(127, $alpha)));
    }
}
