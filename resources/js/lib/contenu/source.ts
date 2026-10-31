import type { BaseHorsLigne } from '@/lib/hors-ligne/base';

/**
 * D'où vient un contenu (HORS_LIGNE.md A.4) :
 *
 *   élément présent dans un pack local ? → afficher depuis Dexie (0 octet réseau)
 *   sinon → props Inertia (en ligne) ; hors ligne : « pas encore téléchargé »
 *
 * Un pack (lot 7) range chaque élément dans la table `contenus` de la base
 * locale, sous la clé `<type>:<uuid>`, avec **les props mêmes que l'écran
 * reçoit du serveur** : l'écran ne sait pas d'où elles viennent, et le même
 * `ContenuBlocs` les affiche.
 *
 * Ce fichier n'importe ni React ni Inertia, pour rester testable.
 */

/** Un élément de pack dans la table `contenus`. */
export type ContenuLocal = {
    cle: string;
    pack: string;
    props: Record<string, unknown>;
};

/** Écran qui sait s'afficher depuis un pack : son composant et sa clé. */
export type PageLocale = { component: string; cle: string };

const ECRANS_LOCAUX: { motif: RegExp; component: string; type: string }[] = [
    {
        motif: /^\/eleve\/lecons\/([0-9a-f-]{36})\/?$/i,
        component: 'eleve/lecon',
        type: 'lecon',
    },
];

export function cleContenu(type: string, uuid: string): string {
    return `${type}:${uuid.toLowerCase()}`;
}

/** L'écran local d'une adresse, ou `null` si elle ne s'affiche qu'en ligne. */
export function pageLocaleDe(chemin: string): PageLocale | null {
    for (const ecran of ECRANS_LOCAUX) {
        const trouve = chemin.split(/[?#]/)[0].match(ecran.motif);

        if (trouve) {
            return {
                component: ecran.component,
                cle: cleContenu(ecran.type, trouve[1]),
            };
        }
    }

    return null;
}

/** Les props d'un écran lues dans un pack, ou `null` si l'élément n'y est pas. */
export async function lirePageLocale(
    base: Pick<BaseHorsLigne, 'contenus'>,
    chemin: string,
): Promise<(PageLocale & { props: Record<string, unknown> }) | null> {
    const page = pageLocaleDe(chemin);

    if (page === null) {
        return null;
    }

    try {
        const ligne = (await base.contenus.get(page.cle)) as
            | ContenuLocal
            | undefined;

        return ligne?.props ? { ...page, props: ligne.props } : null;
    } catch {
        // Base indisponible (navigation privée) : comme si rien n'était téléchargé.
        return null;
    }
}
