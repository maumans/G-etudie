/**
 * Format des codes prépayés (lot 9) — jumeau de `App\Support\CodeAcces`,
 * testés sur le même jeu d'exemples (`tests/fixtures/codes-acces.json`).
 * 12 caractères sans 0/O ni 1/I, le dernier est une clé de contrôle : une
 * faute de frappe se voit ici, avant tout envoi (et avant d'user un essai).
 */
export const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const LONGUEUR = 12;

export function cleDeControle(corps: string): string {
    let somme = 0;

    for (let rang = 0; rang < corps.length; rang++) {
        somme += (2 * rang + 1) * Math.max(0, ALPHABET.indexOf(corps[rang]));
    }

    return ALPHABET[somme % ALPHABET.length];
}

/** Ce que l'élève tape, réduit aux caractères utiles, en capitales. */
export function nettoyer(saisie: string): string {
    return saisie.toUpperCase().replace(/[\s\-–.]/g, '');
}

/** « k7rd 2mxq-9hpb » → « K7RD2MXQ9HPB », ou `null` si le code est mal tapé. */
export function normaliser(saisie: string): string | null {
    const code = nettoyer(saisie);

    if (
        code.length !== LONGUEUR ||
        code.split('').some((c) => !ALPHABET.includes(c))
    ) {
        return null;
    }

    return cleDeControle(code.slice(0, -1)) === code.slice(-1) ? code : null;
}

/** Pendant la saisie : « K7RD2M » → « K7RD-2M ». */
export function grouper(saisie: string): string {
    const code = nettoyer(saisie).slice(0, LONGUEUR);

    return (code.match(/.{1,4}/g) ?? []).join('-');
}

/** Pourquoi le code n'est pas encore bon, ou `null` s'il l'est. */
export function diagnostic(saisie: string): string | null {
    const code = nettoyer(saisie);
    const intrus = code.split('').find((c) => !ALPHABET.includes(c));

    if (intrus === '0' || intrus === 'O') {
        return 'Un code ne contient ni « 0 » ni « O » : relis ce caractère sur la carte.';
    }

    if (intrus === '1' || intrus === 'I') {
        return 'Un code ne contient ni « 1 » ni « I » : relis ce caractère sur la carte.';
    }

    if (intrus) {
        return `« ${intrus} » ne fait pas partie d’un code.`;
    }

    if (code.length < LONGUEUR) {
        return `Encore ${LONGUEUR - code.length} caractère${LONGUEUR - code.length > 1 ? 's' : ''}.`;
    }

    if (code.length > LONGUEUR) {
        return 'Un code a 12 caractères.';
    }

    return normaliser(code) === null
        ? 'Ce code est mal tapé : vérifie chaque caractère.'
        : null;
}
