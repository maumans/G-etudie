/**
 * La carte de partage d'un quiz de culture générale (lot 12, « défis entre
 * amis », PLAN M10) : une image dessinée sur l'appareil (hors ligne, rien à
 * télécharger), partagée par le menu du téléphone. **Le prénom seul**,
 * jamais le pseudo, le numéro ni l'établissement (CLAUDE.md § 9) ; le défi
 * se fait hors de l'application, entre amis, sans échange de données.
 *
 * Couleurs : jetons d'`app.css` écrits en valeurs (un canvas ne lit pas les
 * classes) ; le soleil de la culture générale.
 */
export type DonneesCarteCulture = {
    prenom: string;
    justes: number;
    total: number;
    exemple: boolean;
};

const ENCRE = '#17130f';
const CREME = '#fdf8f1';
const SOLEIL = '#c69b0e';
const MANDARINE = '#f6641b';

export function texteCarteCulture(d: DonneesCarteCulture): string {
    return `${d.prenom} a eu ${d.justes}/${d.total} au quiz de culture générale sur N’karamögö. Et toi, tu fais mieux ?`;
}

export async function dessinerCarteCulture(
    d: DonneesCarteCulture,
): Promise<Blob> {
    const taille = 1080;
    const canvas = document.createElement('canvas');
    canvas.width = taille;
    canvas.height = taille;
    const c = canvas.getContext('2d');

    if (!c) {
        throw new Error('Dessin indisponible sur ce téléphone.');
    }

    const police = getComputedStyle(document.body).fontFamily || 'sans-serif';

    c.fillStyle = ENCRE;
    c.fillRect(0, 0, taille, taille);

    const halo = c.createRadialGradient(880, 180, 40, 880, 180, 640);
    halo.addColorStop(0, 'rgba(198, 155, 14, 0.5)');
    halo.addColorStop(1, 'rgba(198, 155, 14, 0)');
    c.fillStyle = halo;
    c.fillRect(0, 0, taille, taille);

    c.fillStyle = CREME;
    c.font = `600 44px ${police}`;
    c.fillText('N’karamögö', 96, 140);

    c.fillStyle = 'rgba(253, 248, 241, 0.7)';
    c.font = `400 40px ${police}`;
    c.fillText('Quiz de culture générale', 96, 330);
    c.fillText('Guinée · Afrique · Monde', 96, 386);

    c.fillStyle = CREME;
    c.font = `700 260px ${police}`;
    const score = String(d.justes);
    c.fillText(score, 88, 660);
    const largeur = c.measureText(score).width;
    c.fillStyle = SOLEIL;
    c.font = `600 96px ${police}`;
    c.fillText(`/${d.total}`, 88 + largeur + 18, 660);

    c.fillStyle = CREME;
    c.font = `500 52px ${police}`;
    c.fillText(`${d.prenom} te défie !`, 96, 820);

    c.font = `600 34px ${police}`;

    if (d.exemple) {
        c.fillStyle = '#ffc21a';
        c.fillText('EXEMPLE — contenu fictif', 96, 960);
    } else {
        c.fillStyle = MANDARINE;
        c.fillText('Et toi, tu fais mieux ?', 96, 960);
    }

    return new Promise((resoudre, rejeter) =>
        canvas.toBlob(
            (blob) =>
                blob ? resoudre(blob) : rejeter(new Error('Image non créée.')),
            'image/png',
        ),
    );
}

export async function partagerCarteCulture(
    d: DonneesCarteCulture,
): Promise<'partagee' | 'telechargee'> {
    const blob = await dessinerCarteCulture(d);
    const fichier = new File([blob], 'quiz-culture.png', { type: 'image/png' });

    if (navigator.canShare?.({ files: [fichier] })) {
        await navigator.share({ files: [fichier], text: texteCarteCulture(d) });

        return 'partagee';
    }

    const lien = document.createElement('a');
    lien.href = URL.createObjectURL(blob);
    lien.download = 'quiz-culture.png';
    lien.click();
    URL.revokeObjectURL(lien.href);

    return 'telechargee';
}
