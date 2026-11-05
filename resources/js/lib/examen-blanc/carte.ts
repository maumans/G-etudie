import { formaterNote } from './note';

/**
 * La carte de partage d'un examen blanc (PLAN M7) : une image dessinée sur
 * l'appareil (hors ligne, sans rien télécharger), partagée par le menu du
 * téléphone (WhatsApp…). **Le prénom seul**, jamais le pseudo, le numéro ni
 * l'établissement (CLAUDE.md § 9).
 *
 * Les couleurs sont celles des jetons d'`app.css` (mandarine, encre, crème),
 * écrites en valeurs : un canvas ne lit pas les classes.
 */
export type DonneesCarte = {
    prenom: string;
    matiere: string;
    session: string;
    note: number;
    exemple: boolean;
};

const ENCRE = '#17130f';
const CREME = '#fdf8f1';
const MANDARINE = '#f6641b';
const SOLEIL = '#ffc21a';

export function texteCarte(d: DonneesCarte): string {
    return `${d.prenom} a eu ${formaterNote(d.note)}/20 à l’examen blanc de ${d.matiere} (${d.session}) sur N’karamögö.`;
}

export async function dessinerCarte(d: DonneesCarte): Promise<Blob> {
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

    // Le halo mandarine, en haut à droite (le « moment fort » de la marque).
    const halo = c.createRadialGradient(900, 160, 40, 900, 160, 620);
    halo.addColorStop(0, 'rgba(246, 100, 27, 0.55)');
    halo.addColorStop(1, 'rgba(246, 100, 27, 0)');
    c.fillStyle = halo;
    c.fillRect(0, 0, taille, taille);

    c.fillStyle = CREME;
    c.font = `600 44px ${police}`;
    c.fillText('N’karamögö', 96, 140);

    c.fillStyle = 'rgba(253, 248, 241, 0.7)';
    c.font = `400 40px ${police}`;
    c.fillText(`Examen blanc · ${d.matiere}`, 96, 330);
    c.fillText(d.session, 96, 386);

    c.fillStyle = CREME;
    c.font = `700 260px ${police}`;
    const note = formaterNote(d.note);
    c.fillText(note, 88, 660);
    const largeur = c.measureText(note).width;
    c.fillStyle = MANDARINE;
    c.font = `600 96px ${police}`;
    c.fillText('/20', 88 + largeur + 18, 660);

    c.fillStyle = CREME;
    c.font = `500 52px ${police}`;
    c.fillText(`Bravo, ${d.prenom} !`, 96, 820);

    if (d.exemple) {
        c.fillStyle = SOLEIL;
        c.font = `600 34px ${police}`;
        c.fillText('EXEMPLE — contenu fictif', 96, 960);
    } else {
        c.fillStyle = 'rgba(253, 248, 241, 0.6)';
        c.font = `400 34px ${police}`;
        c.fillText('Révise le CEE, le BEPC et le Bac avec N’karamögö', 96, 960);
    }

    return new Promise((resoudre, rejeter) =>
        canvas.toBlob(
            (blob) =>
                blob ? resoudre(blob) : rejeter(new Error('Image non créée.')),
            'image/png',
        ),
    );
}

/**
 * Partage par le menu du téléphone ; sinon (ordinateur), téléchargement de
 * l'image. Rend `partagee` ou `telechargee`.
 */
export async function partagerCarte(
    d: DonneesCarte,
): Promise<'partagee' | 'telechargee'> {
    const blob = await dessinerCarte(d);
    const fichier = new File([blob], 'examen-blanc.png', { type: 'image/png' });

    if (navigator.canShare?.({ files: [fichier] })) {
        await navigator.share({ files: [fichier], text: texteCarte(d) });

        return 'partagee';
    }

    const lien = document.createElement('a');
    lien.href = URL.createObjectURL(blob);
    lien.download = 'examen-blanc.png';
    lien.click();
    URL.revokeObjectURL(lien.href);

    return 'telechargee';
}
