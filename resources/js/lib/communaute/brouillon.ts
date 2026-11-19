/**
 * Le brouillon d'un message du fil d'un groupe (lot 12) : gardé sur
 * l'appareil à chaque frappe, pour qu'une coupure ou un onglet fermé ne
 * fasse rien perdre (PLAN § 9 : « toute saisie survit à une coupure »). Le
 * fil lui-même est en ligne seulement (niveau C) : le message part quand le
 * réseau est là. Une commodité locale, jamais synchronisée ; le stockage
 * peut manquer (navigation privée) : rien n'échoue pour autant.
 */
const PREFIXE = 'nkaramogo.fil.brouillon';

export function cleBrouillon(
    groupe: number,
    auteur: number,
    parent: string | null,
): string {
    return `${PREFIXE}.${auteur}.${groupe}.${parent ?? 'question'}`;
}

export function lireBrouillon(cle: string): string {
    try {
        return window.localStorage.getItem(cle) ?? '';
    } catch {
        return '';
    }
}

export function ecrireBrouillon(cle: string, texte: string): void {
    try {
        if (texte.trim() === '') {
            window.localStorage.removeItem(cle);
        } else {
            window.localStorage.setItem(cle, texte.slice(0, 2000));
        }
    } catch {
        // Stockage indisponible : le texte reste dans le champ.
    }
}

export function effacerBrouillon(cle: string): void {
    ecrireBrouillon(cle, '');
}

/** Ce que l'élève voit sous le champ : « 120 / 500 », en alerte près de la limite. */
export function compteur(
    texte: string,
    max: number,
): { libelle: string; alerte: boolean; trop: boolean } {
    // Points de code, comme mb_strlen côté serveur (FilGroupeService).
    const longueur = Array.from(texte.trim()).length;

    return {
        libelle: `${longueur} / ${max}`,
        alerte: longueur > max * 0.9,
        trop: longueur > max,
    };
}
