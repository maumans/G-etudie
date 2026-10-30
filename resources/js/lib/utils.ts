import type { InertiaLinkProps } from '@inertiajs/react';
import { clsx } from 'clsx';
import type { ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * tailwind-merge doit connaître les jetons Ardoise : sinon il prend
 * `text-interface` (une taille) pour une couleur et supprime le `text-white`
 * qui le précède — bouton plein à texte sombre sur fond nimba (vu par axe).
 */
const twMerge = extendTailwindMerge({
    extend: {
        theme: {
            text: [
                'meta',
                'aide',
                'interface',
                'lecture',
                'titre-carte',
                'titre-ecran',
                'titre-ecran-large',
                'heros',
                'vitrine',
            ],
            radius: ['controle', 'carte', 'feuille', 'badge'],
            shadow: ['carte', 'releve', 'bouton', 'flottant'],
            font: ['titre', 'accent'],
        },
        classGroups: {
            'fvn-spacing': ['font-data'],
        },
    },
});

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function toUrl(url: NonNullable<InertiaLinkProps['href']>): string {
    return typeof url === 'string' ? url : url.url;
}

/** Espace insécable : sépare les milliers et colle « GNF » au montant. */
export const ESPACE_INSECABLE = ' ';

/**
 * 1234567.5 → « 1 234 567,5 » : espace insécable entre les milliers, virgule
 * décimale, deux décimales au plus (zéros finaux retirés).
 */
export function formaterNombre(valeur: number): string {
    const arrondi = Math.abs(valeur).toFixed(2);
    const [entier, decimales] = arrondi.split('.');
    const negatif = valeur < 0 && Number(arrondi) !== 0;
    const groupes = entier.replace(/\B(?=(\d{3})+(?!\d))/g, ESPACE_INSECABLE);
    const reste = decimales.replace(/0+$/, '');

    return (negatif ? '-' : '') + groupes + (reste ? `,${reste}` : '');
}

/**
 * Relit un nombre saisi à la française : « 12 500 », « 3,5 », « 3.5 »
 * → 12500, 3.5. Rend null pour une saisie vide ou illisible.
 */
export function lireNombre(saisie: string): number | null {
    const propre = saisie.replace(/[\s  ]/g, '').replace(',', '.');

    if (!/^-?\d+(\.\d+)?$/.test(propre)) {
        return null;
    }

    return Number(propre);
}

/**
 * Le seul format des montants : « 100 000 GNF ». Son équivalent PHP,
 * App\Support\Gnf::formater(), est testé sur le même jeu d'exemples
 * (tests/fixtures/gnf.json).
 */
export function formaterGnf(montant: number): string {
    return `${formaterNombre(montant)}${ESPACE_INSECABLE}GNF`;
}
