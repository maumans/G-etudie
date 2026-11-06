import type { BaseHorsLigne } from '@/lib/hors-ligne/base';
import type { Transport } from '@/lib/hors-ligne/moteur';

/**
 * Les packs sur l'appareil (HORS_LIGNE.md A.5, HL5).
 *
 * - **Toujours demandé par l'élève** : rien ne se télécharge tout seul.
 * - **Morceau par morceau** : chaque morceau reçu est rangé tout de suite
 *   (table `contenus`), avec sa progression. Une coupure ne fait
 *   recommencer qu'un morceau ; reprendre ne redemande que ce qui manque.
 * - **Différentiel** : ce qui doit venir, ce sont les éléments dont
 *   l'empreinte locale diffère du manifeste. Une mise à jour après la
 *   correction d'un corrigé ne demande donc que cet élément (A.11 : < 20 Ko).
 *   Un élément retiré du manifeste est effacé.
 * - **Partagés entre les profils** du téléphone : la fratrie paie une fois.
 *   Ils restent quand un profil se déconnecte.
 * - **Expiration** : un pack d'abonné porte `expire_le` ; hors ligne,
 *   l'appareil la vérifie avec sa propre horloge (falsifiable, et accepté,
 *   A.5). Un pack expiré ne s'affiche plus.
 *
 * Ce fichier n'importe ni React ni Inertia, pour rester testable.
 */

/** [clé, empreinte, morceau] */
export type ElementManifeste = [string, string, number];

export type ManifestePack = {
    pack: string;
    titre: string;
    matiere: { cle: string; nom: string; slug: string };
    version: string;
    genere_le: string | null;
    taille_octets: number;
    taille_sans_images: number;
    morceaux: number;
    expire_le: string | null;
    est_exemple: boolean;
    medias: string[];
    elements: ElementManifeste[];
};

/** Un pack dans la table `packs`. */
export type PackLocal = {
    cle: string;
    titre: string;
    matiere: { cle: string; nom: string; slug: string };
    /** Version entièrement présente sur l'appareil (null : premier téléchargement pas fini). */
    version: string | null;
    /** Version en cours de téléchargement, ou annoncée par le serveur. */
    cible: string | null;
    statut: 'en_cours' | 'complet';
    taille_octets: number;
    expire_le: string | null;
    est_exemple: boolean;
    /** Éléments reçus / à recevoir pour la cible. */
    recus: number;
    attendus: number;
    octets_recus: number;
    telecharge_le: string | null;
    /** La version courante du serveur, quand le battement en annonce une autre. */
    a_jour: boolean;
    /** Le serveur ne propose plus ce pack à ce profil. */
    indisponible?: boolean;
};

/** Un élément de pack dans la table `contenus`. */
export type ContenuPack = {
    cle: string;
    pack: string;
    empreinte: string;
    props: Record<string, unknown>;
};

export class ErreurPack extends Error {
    constructor(
        message: string,
        public readonly statut: number | null,
    ) {
        super(message);
    }
}

export const urlsPack = {
    prendre: (cle: string) => `/eleve/packs/${cle}/prendre`,
    manifeste: (cle: string) => `/eleve/packs/${cle}/manifeste`,
    morceau: (cle: string, numero: number, version: string) =>
        `/eleve/packs/${cle}/morceaux/${numero}?version=${version}`,
    elements: (cle: string) => `/eleve/packs/${cle}/elements`,
    retirer: (cle: string) => `/eleve/packs/${cle}`,
};

/** Plus de cette part d'un morceau à refaire : on prend le morceau entier. */
const PART_MORCEAU = 0.5;
const LOT_ELEMENTS = 200;

export type Progression = {
    recus: number;
    attendus: number;
    octets: number;
};

type Base = Pick<BaseHorsLigne, 'packs' | 'contenus' | 'transaction'>;

type OptionsTelechargement = {
    /** Premier téléchargement : le pack est « pris » (place gratuite, HL-D3). */
    premier?: boolean;
    surProgression?: (progression: Progression) => void;
    maintenant?: () => Date;
};

function messageDe(corps: unknown, repli: string): string {
    const message = (corps as { message?: unknown } | null)?.message;

    return typeof message === 'string' && message !== '' ? message : repli;
}

/** Packs complets et utilisables (non expirés), pour l'en-tête `X-Packs`. */
export async function packsPresents(
    base: Pick<BaseHorsLigne, 'packs'>,
): Promise<PackLocal[]> {
    try {
        return ((await base.packs.toArray()) as PackLocal[]).filter(
            (pack) => pack.version !== null,
        );
    } catch {
        return [];
    }
}

/** « bepc-maths@3f2a…,bepc-francais@91c0… » */
export function annonceDesPacks(packs: PackLocal[]): string {
    return packs.map((pack) => `${pack.cle}@${pack.version}`).join(',');
}

export function estUtilisable(
    pack: Pick<PackLocal, 'expire_le' | 'version'>,
    maintenant: Date = new Date(),
): boolean {
    return (
        pack.version !== null &&
        (pack.expire_le === null ||
            Date.parse(pack.expire_le) > maintenant.getTime())
    );
}

/**
 * Télécharge (ou reprend, ou met à jour) un pack. Ne demande que les
 * éléments absents ou changés. Rend le pack local à jour.
 */
export async function telechargerPack(
    base: Base,
    transport: Transport,
    cle: string,
    options: OptionsTelechargement = {},
): Promise<PackLocal> {
    const maintenant = options.maintenant ?? (() => new Date());
    let tentatives = 0;

    for (;;) {
        const manifeste = await lireManifeste(
            transport,
            cle,
            options.premier === true && tentatives === 0,
        );

        try {
            return await appliquerManifeste(
                base,
                transport,
                manifeste,
                options.surProgression,
                maintenant,
            );
        } catch (erreur) {
            // Le pack a changé pendant le téléchargement : on reprend sur le
            // nouveau manifeste ; ce qui est déjà rangé n'est pas redemandé.
            if (
                erreur instanceof ErreurPack &&
                erreur.statut === 409 &&
                tentatives < 2
            ) {
                tentatives++;
                continue;
            }

            throw erreur;
        }
    }
}

async function lireManifeste(
    transport: Transport,
    cle: string,
    premier: boolean,
): Promise<ManifestePack> {
    let reponse;

    try {
        reponse = await transport(
            premier
                ? { methode: 'POST', url: urlsPack.prendre(cle), corps: {} }
                : { methode: 'GET', url: urlsPack.manifeste(cle) },
        );
    } catch {
        throw new ErreurPack(
            'Pas de connexion : le téléchargement reprendra où il s’est arrêté.',
            null,
        );
    }

    if (reponse.statut !== 200) {
        throw new ErreurPack(
            messageDe(
                reponse.corps,
                reponse.statut === 404
                    ? 'Ce pack n’est plus proposé.'
                    : 'Téléchargement impossible pour le moment.',
            ),
            reponse.statut,
        );
    }

    return reponse.corps as ManifestePack;
}

async function appliquerManifeste(
    base: Base,
    transport: Transport,
    manifeste: ManifestePack,
    surProgression: OptionsTelechargement['surProgression'],
    maintenant: () => Date,
): Promise<PackLocal> {
    const cles = manifeste.elements.map(([cle]) => cle);
    const locaux = (await base.contenus.bulkGet(cles)) as (
        | ContenuPack
        | undefined
    )[];
    const manquants = manifeste.elements.filter(
        ([, empreinte], rang) => locaux[rang]?.empreinte !== empreinte,
    );
    const precedent = (await base.packs.get(manifeste.pack)) as
        | PackLocal
        | undefined;

    const etat: PackLocal = {
        cle: manifeste.pack,
        titre: manifeste.titre,
        matiere: manifeste.matiere,
        version: precedent?.version ?? null,
        cible: manifeste.version,
        statut: 'en_cours',
        taille_octets: manifeste.taille_octets,
        expire_le: manifeste.expire_le,
        est_exemple: manifeste.est_exemple,
        recus: 0,
        attendus: manquants.length,
        octets_recus: precedent?.octets_recus ?? 0,
        telecharge_le: precedent?.telecharge_le ?? null,
        a_jour: precedent?.a_jour ?? false,
    };
    await base.packs.put(etat);
    surProgression?.({ recus: 0, attendus: etat.attendus, octets: 0 });

    // Par morceau : le morceau entier si l'essentiel manque, sinon les
    // éléments un à un (différentiel).
    const parMorceau = new Map<number, string[]>();
    const totalParMorceau = new Map<number, number>();

    for (const [, , morceau] of manifeste.elements) {
        totalParMorceau.set(morceau, (totalParMorceau.get(morceau) ?? 0) + 1);
    }

    for (const [cle, , morceau] of manquants) {
        parMorceau.set(morceau, [...(parMorceau.get(morceau) ?? []), cle]);
    }

    let octets = 0;

    for (const [morceau, siens] of [...parMorceau.entries()].sort(
        ([a], [b]) => a - b,
    )) {
        const entier =
            siens.length / (totalParMorceau.get(morceau) ?? 1) > PART_MORCEAU;
        const requetes = entier
            ? [
                  {
                      methode: 'GET' as const,
                      url: urlsPack.morceau(
                          manifeste.pack,
                          morceau,
                          manifeste.version,
                      ),
                  },
              ]
            : decouper(siens, LOT_ELEMENTS).map((lot) => ({
                  methode: 'POST' as const,
                  url: urlsPack.elements(manifeste.pack),
                  corps: { version: manifeste.version, cles: lot },
              }));

        for (const requete of requetes) {
            const recu = await recevoir(base, transport, manifeste, requete);
            octets += recu.octets;
            etat.recus += recu.elements;
            etat.octets_recus += recu.octets;
            await base.packs.update(manifeste.pack, {
                recus: Math.min(etat.recus, etat.attendus),
                octets_recus: etat.octets_recus,
            });
            surProgression?.({
                recus: Math.min(etat.recus, etat.attendus),
                attendus: etat.attendus,
                octets,
            });
        }
    }

    // Tout est là : on efface ce que le manifeste ne cite plus.
    const voulus = new Set(cles);
    const fini: PackLocal = {
        ...etat,
        version: manifeste.version,
        cible: manifeste.version,
        statut: 'complet',
        recus: etat.attendus,
        telecharge_le: maintenant().toISOString(),
        a_jour: true,
        indisponible: false,
    };

    await base.transaction('rw', [base.packs, base.contenus], async () => {
        const anciens = (await base.contenus
            .where('pack')
            .equals(manifeste.pack)
            .primaryKeys()) as string[];
        await base.contenus.bulkDelete(
            anciens.filter((cle) => !voulus.has(cle)),
        );
        await base.packs.put(fini);
    });

    return fini;
}

function decouper<T>(liste: T[], taille: number): T[][] {
    const lots: T[][] = [];

    for (let i = 0; i < liste.length; i += taille) {
        lots.push(liste.slice(i, i + taille));
    }

    return lots;
}

async function recevoir(
    base: Base,
    transport: Transport,
    manifeste: ManifestePack,
    requete: Parameters<Transport>[0],
): Promise<{ elements: number; octets: number }> {
    let reponse;

    try {
        reponse = await transport(requete);
    } catch {
        throw new ErreurPack(
            'Connexion perdue : le téléchargement reprendra où il s’est arrêté.',
            null,
        );
    }

    if (reponse.statut !== 200) {
        throw new ErreurPack(
            messageDe(reponse.corps, 'Téléchargement interrompu.'),
            reponse.statut,
        );
    }

    const corps = reponse.corps as {
        version: string;
        elements: {
            cle: string;
            empreinte: string;
            props: Record<string, unknown>;
        }[];
    };

    if (corps.version !== manifeste.version) {
        throw new ErreurPack('Ce pack vient d’être mis à jour.', 409);
    }

    await base.contenus.bulkPut(
        corps.elements.map(
            (element) =>
                ({
                    cle: element.cle,
                    pack: manifeste.pack,
                    empreinte: element.empreinte,
                    props: element.props,
                }) satisfies ContenuPack,
        ),
    );

    return {
        elements: corps.elements.length,
        octets: JSON.stringify(corps).length,
    };
}

/**
 * Supprime un pack du téléphone (ses contenus aussi). La place gratuite est
 * libérée côté serveur quand le réseau le permet (`liberer`).
 */
export async function supprimerPack(base: Base, cle: string): Promise<void> {
    await base.transaction('rw', [base.packs, base.contenus], async () => {
        await base.contenus.where('pack').equals(cle).delete();
        await base.packs.delete(cle);
    });
}

export async function libererPack(
    transport: Transport,
    cle: string,
): Promise<boolean> {
    try {
        const reponse = await transport({
            methode: 'POST',
            url: urlsPack.retirer(cle),
            corps: { _method: 'DELETE' },
        });

        return reponse.statut === 200 || reponse.statut === 404;
    } catch {
        return false;
    }
}

/**
 * Ce que le battement dit des packs présents (`GET /sync/etat`) : une
 * nouvelle version (le pack n'est plus à jour), une expiration, ou `null`
 * (plus proposé à ce profil).
 */
export async function noterEtatDesPacks(
    base: Pick<BaseHorsLigne, 'packs'>,
    annonces: Record<
        string,
        { version: string | null; expire_le: string | null } | null
    >,
): Promise<void> {
    for (const [cle, annonce] of Object.entries(annonces ?? {})) {
        const pack = (await base.packs.get(cle)) as PackLocal | undefined;

        if (!pack) {
            continue;
        }

        await base.packs.update(
            cle,
            annonce === null
                ? { indisponible: true }
                : {
                      a_jour: annonce.version === pack.version,
                      cible: annonce.version,
                      expire_le: annonce.expire_le,
                      indisponible: false,
                  },
        );
    }
}

/** Les matières des packs présents et utilisables (séances préparées par matière, A.10). */
export async function matieresTelechargees(
    base: Pick<BaseHorsLigne, 'packs'>,
    maintenant: Date = new Date(),
): Promise<string[]> {
    return (await packsPresents(base))
        .filter((pack) => estUtilisable(pack, maintenant))
        .map((pack) => pack.matiere.slug);
}

/** Place occupée et restante sur l'appareil, si le navigateur le dit. */
export async function placeSurLAppareil(): Promise<{
    utilise: number;
    disponible: number;
} | null> {
    try {
        const estimation = await navigator.storage?.estimate?.();

        if (!estimation?.quota) {
            return null;
        }

        return {
            utilise: estimation.usage ?? 0,
            disponible: Math.max(0, estimation.quota - (estimation.usage ?? 0)),
        };
    } catch {
        return null;
    }
}

/** Après le premier pack : demander que le stockage ne soit pas effacé (HL-D11). */
export async function demanderStockagePersistant(): Promise<boolean> {
    try {
        return (await navigator.storage?.persist?.()) ?? false;
    } catch {
        return false;
    }
}
