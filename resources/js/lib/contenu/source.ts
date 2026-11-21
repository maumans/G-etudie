import type { BaseHorsLigne } from '@/lib/hors-ligne/base';
import { estUtilisable } from '@/lib/hors-ligne/packs';
import type { PackLocal } from '@/lib/hors-ligne/packs';

/**
 * D'où vient un contenu (HORS_LIGNE.md A.4) :
 *
 *   élément présent dans un pack local ? → afficher depuis Dexie (0 octet réseau)
 *   sinon → props Inertia (en ligne) ; hors ligne : « pas encore téléchargé »
 *
 * Un pack (lot 7, `lib/hors-ligne/packs.ts`) range chaque élément dans la
 * table `contenus`, sous la clé `<type>:<identifiant>`, avec **les props
 * mêmes que l'écran reçoit du serveur** : l'écran ne sait pas d'où elles
 * viennent, et le même `ContenuBlocs` les affiche. Ce que le pack ne porte
 * pas (rien de personnel), l'écran le reçoit vide : une leçon lue depuis le
 * pack n'a pas d'état de lecture, un sujet pas de scores.
 *
 * Ce fichier n'importe ni React ni Inertia, pour rester testable.
 */

/** Un élément de pack dans la table `contenus`. */
export type ContenuLocal = {
    cle: string;
    pack: string;
    props: Record<string, unknown>;
};

/**
 * Écran qui sait s'afficher depuis un pack : son composant et sa clé
 * (`slug` : la page d'une matière, dont la clé dépend du pack présent).
 */
export type PageLocale = { component: string; cle: string; slug?: string };

const UUID = '([0-9a-f-]{36})';

const ECRANS_LOCAUX: { motif: RegExp; component: string; type: string }[] = [
    {
        motif: new RegExp(`^/eleve/lecons/${UUID}/?$`, 'i'),
        component: 'eleve/lecon',
        type: 'lecon',
    },
    // Lot 6 (HL4) : les séances préparées d'avance, rangées par
    // lib/progression/locale.ts avec les props mêmes de la route.
    {
        motif: new RegExp(`^/eleve/seances/${UUID}/?$`, 'i'),
        component: 'eleve/seance',
        type: 'seance',
    },
    // Lot 7 (HL5) : ce qu'apporte un pack.
    {
        motif: new RegExp(`^/eleve/sujets/${UUID}/?$`, 'i'),
        component: 'eleve/sujet',
        type: 'annale',
    },
    {
        motif: /^\/eleve\/chapitres\/(\d+)\/fiche\/?$/,
        component: 'eleve/fiche',
        type: 'fiche',
    },
    {
        motif: /^\/eleve\/cours\/([a-z0-9-]+)\/?$/,
        component: 'eleve/matiere',
        type: 'matiere',
    },
];

/** Un pack d'où vient un élément : celui des séances préparées n'en est pas un. */
export const PACK_SEANCES = 'seances';

export function cleContenu(type: string, uuid: string): string {
    return `${type}:${uuid.toLowerCase()}`;
}

/** L'écran local d'une adresse, ou `null` si elle ne s'affiche qu'en ligne. */
export function pageLocaleDe(chemin: string): PageLocale | null {
    for (const ecran of ECRANS_LOCAUX) {
        const trouve = chemin.split(/[?#]/)[0].match(ecran.motif);

        if (trouve) {
            return ecran.type === 'matiere'
                ? {
                      component: ecran.component,
                      cle: `matiere:?${trouve[1]}`,
                      slug: trouve[1],
                  }
                : {
                      component: ecran.component,
                      cle: cleContenu(ecran.type, trouve[1]),
                  };
        }
    }

    return null;
}

type Base = Pick<BaseHorsLigne, 'contenus'> &
    Partial<Pick<BaseHorsLigne, 'packs'>>;

/**
 * La page d'une matière : le pack de cette matière présent sur l'appareil.
 * Deux packs de la même matière (frère au BEPC, sœur au Bac) : `prefere`
 * (le dernier pack ouvert par ce profil), sinon le plus récent.
 */
async function cleMatiere(
    base: Base,
    slug: string,
    maintenant: Date,
    prefere: string | null,
): Promise<string | null> {
    if (!base.packs) {
        return null;
    }

    const packs = ((await base.packs.toArray()) as PackLocal[])
        .filter(
            (pack) =>
                pack.matiere?.slug === slug && estUtilisable(pack, maintenant),
        )
        .sort((a, b) =>
            (b.telecharge_le ?? '').localeCompare(a.telecharge_le ?? ''),
        );
    const choisi =
        packs.find((pack) => pack.cle === prefere) ?? packs[0] ?? null;

    return choisi ? `matiere:${choisi.cle}` : null;
}

/** Un pack expiré ne s'affiche plus (A.5) ; une séance préparée n'a pas de pack. */
async function packUtilisable(
    base: Base,
    pack: string,
    maintenant: Date,
): Promise<boolean> {
    if (pack === PACK_SEANCES || !base.packs) {
        return true;
    }

    const ligne = (await base.packs.get(pack)) as PackLocal | undefined;

    return ligne === undefined || estUtilisable(ligne, maintenant);
}

/** Ce que l'écran attend et que le pack ne porte pas. */
async function completer(
    base: Base,
    component: string,
    props: Record<string, unknown>,
    parametres: URLSearchParams,
): Promise<Record<string, unknown>> {
    switch (component) {
        case 'eleve/lecon':
            return {
                progression: { etat: null, position: 0 },
                ...props,
            };
        case 'eleve/fiche': {
            const uuids = props.lecons_du_pack;

            if (!Array.isArray(uuids)) {
                return props;
            }

            const lignes = (await base.contenus.bulkGet(
                uuids.map((uuid: string) => cleContenu('lecon', uuid)),
            )) as (ContenuLocal | undefined)[];

            return {
                ...props,
                lecons: lignes
                    .map((ligne) => ligne?.props.lecon)
                    .filter(Boolean),
            };
        }
        case 'eleve/sujet': {
            const mode = parametres.get('mode');

            return {
                ...props,
                mode:
                    mode === 'entrainement' || mode === 'examen'
                        ? mode
                        : 'lecture',
                question: parametres.get('question'),
                scores: {},
            };
        }
        default:
            return props;
    }
}

/** Les props d'un écran lues dans un pack, ou `null` si l'élément n'y est pas. */
export async function lirePageLocale(
    base: Base,
    chemin: string,
    options: { maintenant?: Date; prefere?: string | null } = {},
): Promise<(PageLocale & { props: Record<string, unknown> }) | null> {
    const page = pageLocaleDe(chemin);
    const maintenant = options.maintenant ?? new Date();

    if (page === null) {
        return null;
    }

    try {
        const cle =
            page.slug !== undefined
                ? await cleMatiere(
                      base,
                      page.slug,
                      maintenant,
                      options.prefere ?? null,
                  )
                : page.cle;

        if (cle === null) {
            return null;
        }

        const ligne = (await base.contenus.get(cle)) as
            | ContenuLocal
            | undefined;

        if (
            !ligne?.props ||
            !(await packUtilisable(base, ligne.pack, maintenant))
        ) {
            return null;
        }

        const parametres = new URLSearchParams(chemin.split('?')[1] ?? '');

        return {
            component: page.component,
            cle,
            props: await completer(
                base,
                page.component,
                ligne.props,
                parametres,
            ),
        };
    } catch {
        // Base indisponible (navigation privée) : comme si rien n'était téléchargé.
        return null;
    }
}
