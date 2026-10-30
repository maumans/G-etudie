/**
 * Numéros mobiles guinéens : indicatif +224, puis 9 chiffres commençant par 6
 * (affichés « 622 12 34 56 »). Jumeau PHP : App\Support\Telephone, testé
 * sur le même jeu d'exemples
 * (tests/fixtures/telephones.json).
 */
export const INDICATIF = '+224';

const NUMERO_MOBILE = /^6\d{8}$/;

/** Garde les chiffres de la saisie et retire l'indicatif (00224, 224) s'il est présent. */
export function chiffresTelephone(saisie: string): string {
    const chiffres = saisie.replace(/\D/g, '');

    if (chiffres.startsWith('00224')) {
        return chiffres.slice(5);
    }

    if (chiffres.startsWith('224') && chiffres.length > 9) {
        return chiffres.slice(3);
    }

    return chiffres;
}

/** « 622 12 34 56 », « +224622123456 »… → « +224622123456 », ou null si invalide. */
export function normaliserTelephone(saisie: string): string | null {
    const chiffres = chiffresTelephone(saisie);

    return NUMERO_MOBILE.test(chiffres) ? `${INDICATIF}${chiffres}` : null;
}

/** Groupe les chiffres saisis au fil de la frappe : 3, puis 2 par 2 (« 622 12 34 56 »). */
export function formaterTelephone(chiffres: string): string {
    const propres = chiffres.replace(/\D/g, '').slice(0, 9);
    const groupes = [
        propres.slice(0, 3),
        propres.slice(3, 5),
        propres.slice(5, 7),
        propres.slice(7, 9),
    ];

    return groupes.filter(Boolean).join(' ');
}
