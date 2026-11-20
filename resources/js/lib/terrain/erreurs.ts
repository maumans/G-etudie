import type { BaseHorsLigne } from '@/lib/hors-ligne/base';
import type { NouveauGeste } from '@/lib/hors-ligne/moteur';

/**
 * Lot 14 (terrain) : les erreurs d'un appareil, captées, gardées sur le
 * téléphone puis envoyées par la file (`erreurs.signaler`, priorité 9, la
 * plus basse). Sans elles, un essai dit « ça a planté » sans dire quoi.
 *
 * Données minimales (CLAUDE.md § 9) : le chemin de la source sans domaine ni
 * paramètres, un message et une pile tronqués ; le serveur masque encore ce
 * qui ressemblerait à un numéro ou une adresse. Rattachées à l'appareil,
 * jamais à l'élève (TerrainService::signalerErreurs).
 *
 * Garde-fous contre une boucle : 50 erreurs gardées au plus (regroupées), 100
 * captées par chargement, et la capture se tait pendant qu'elle travaille.
 */

export type TypeErreur = 'script' | 'promesse' | 'import' | 'file';

export type ErreurCaptee = {
    type: TypeErreur;
    message: string;
    source: string | null;
    pile: string | null;
    version_app: string | null;
    fois: number;
    vue_le: string;
};

export const CLE_ERREURS = 'erreurs_captees';
export const ERREURS_GARDEES = 50;
export const ERREURS_PAR_ENVOI = 20;
export const CAPTEES_PAR_CHARGEMENT = 100;
export const PRIORITE_ERREURS = 9;

/** Bruit connu, sans rapport avec l'application. */
const BRUIT = [
    /ResizeObserver loop/i,
    /^Script error\.?$/i,
    /extension:\/\//i,
    /chrome-extension:/i,
    /moz-extension:/i,
];

/** Le chemin seul : ni domaine, ni paramètres, ni fragment. */
export function cheminSeul(source: string | null | undefined): string | null {
    if (!source) {
        return null;
    }

    try {
        const url = new URL(source, 'http://appareil.local');

        return url.pathname.slice(0, 300) || null;
    } catch {
        return source.split(/[?#]/)[0].slice(0, 300) || null;
    }
}

/** Une erreur prête à garder, ou `null` si c'est du bruit. */
export function normaliserErreur(
    type: TypeErreur,
    brute: { message?: unknown; source?: unknown; pile?: unknown },
    version: string | null,
    maintenant: Date = new Date(),
): ErreurCaptee | null {
    const message =
        typeof brute.message === 'string'
            ? brute.message.trim()
            : typeof brute.message === 'number' ||
                typeof brute.message === 'boolean'
              ? String(brute.message)
              : '';
    const source = typeof brute.source === 'string' ? brute.source : null;

    if (message === '' || BRUIT.some((motif) => motif.test(message))) {
        return null;
    }

    if (source && BRUIT.some((motif) => motif.test(source))) {
        return null;
    }

    return {
        type,
        message: message.slice(0, 500),
        source: cheminSeul(source),
        pile:
            typeof brute.pile === 'string' && brute.pile !== ''
                ? brute.pile.slice(0, 2000)
                : null,
        version_app: version ? version.slice(0, 64) : null,
        fois: 1,
        vue_le: maintenant.toISOString(),
    };
}

const cleDe = (e: ErreurCaptee) =>
    `${e.type}|${e.message}|${e.source ?? ''}|${e.version_app ?? ''}`;

/*
 * Lire puis réécrire la liste : deux erreurs captées dans le même instant
 * (une exception, puis la promesse qu'elle rejette) s'écraseraient. Les
 * écritures passent donc l'une après l'autre (trouvé par terrain.test.ts).
 */
let ecritures: Promise<unknown> = Promise.resolve();

function lAUneApresLAutre<T>(travail: () => Promise<T>): Promise<T> {
    const suivant = ecritures.then(travail, travail);
    ecritures = suivant.catch(() => undefined);

    return suivant;
}

/** Range une erreur : une erreur déjà gardée voit son compte monter. */
export function rangerErreur(
    base: BaseHorsLigne,
    erreur: ErreurCaptee,
): Promise<void> {
    return lAUneApresLAutre(() => rangerMaintenant(base, erreur));
}

async function rangerMaintenant(
    base: BaseHorsLigne,
    erreur: ErreurCaptee,
): Promise<void> {
    const gardees = (await base.lireMeta<ErreurCaptee[]>(CLE_ERREURS)) ?? [];
    const meme = gardees.find((e) => cleDe(e) === cleDe(erreur));

    if (meme) {
        meme.fois += erreur.fois;
        meme.vue_le = erreur.vue_le;
    } else {
        gardees.push(erreur);
    }

    // Les plus anciennes partent d'abord.
    await base.ecrireMeta(CLE_ERREURS, gardees.slice(-ERREURS_GARDEES));
}

export async function erreursGardees(base: BaseHorsLigne): Promise<number> {
    try {
        return ((await base.lireMeta<ErreurCaptee[]>(CLE_ERREURS)) ?? [])
            .length;
    } catch {
        return 0;
    }
}

/**
 * Confie les erreurs gardées à la file, vingt par geste. Rien sans élève
 * connecté : la file n'a d'auteur que lui (HORS_LIGNE.md A.2).
 */
export async function confierErreurs(
    base: BaseHorsLigne,
    enregistrer: (geste: NouveauGeste) => Promise<string>,
    auteur: number | null,
): Promise<number> {
    if (auteur === null) {
        return 0;
    }

    const lot = await lAUneApresLAutre(async () => {
        const gardees =
            (await base.lireMeta<ErreurCaptee[]>(CLE_ERREURS)) ?? [];
        await base.ecrireMeta(CLE_ERREURS, gardees.slice(ERREURS_PAR_ENVOI));

        return gardees.slice(0, ERREURS_PAR_ENVOI);
    });

    if (lot.length === 0) {
        return 0;
    }

    await enregistrer({
        type: 'erreurs.signaler',
        charge: { erreurs: lot },
        priorite: PRIORITE_ERREURS,
    });

    return lot.length;
}

export type CaptureErreurs = {
    /** À appeler aussi d'ailleurs (échec d'import, geste « À corriger »). */
    noter: (
        type: TypeErreur,
        brute: { message?: unknown; source?: unknown; pile?: unknown },
    ) => void;
    confier: () => Promise<number>;
};

/**
 * Branche la capture : `error` et `unhandledrejection` de la fenêtre, puis
 * un envoi dix secondes après la dernière erreur (et au démarrage).
 */
export function installerCaptureErreurs(options: {
    base: BaseHorsLigne;
    enregistrer: (geste: NouveauGeste) => Promise<string>;
    auteur: () => number | null;
    version: () => string | null;
    cible?: Pick<Window, 'addEventListener'>;
    delaiEnvoiMs?: number;
}): CaptureErreurs {
    let captees = 0;
    let occupe = false;
    let minuterie: ReturnType<typeof setTimeout> | null = null;

    const confier = async (): Promise<number> => {
        if (occupe) {
            return 0;
        }

        occupe = true;

        try {
            return await confierErreurs(
                options.base,
                options.enregistrer,
                options.auteur(),
            );
        } catch {
            return 0;
        } finally {
            occupe = false;
        }
    };

    const noter: CaptureErreurs['noter'] = (type, brute) => {
        if (occupe || captees >= CAPTEES_PAR_CHARGEMENT) {
            return;
        }

        const erreur = normaliserErreur(type, brute, options.version());

        if (erreur === null) {
            return;
        }

        captees++;
        void rangerErreur(options.base, erreur)
            .then(() => {
                if (minuterie) {
                    clearTimeout(minuterie);
                }

                minuterie = setTimeout(
                    () => void confier(),
                    options.delaiEnvoiMs ?? 10_000,
                );
            })
            .catch(() => undefined);
    };

    const cible = options.cible ?? window;
    cible.addEventListener('error', (evenement: Event) => {
        const e = evenement as ErrorEvent;

        // Une ressource absente (image, script) arrive aussi ici, sans message.
        if (!('message' in e) || !e.message) {
            return;
        }

        noter('script', {
            message: e.message,
            source: e.filename,
            pile: e.error instanceof Error ? e.error.stack : undefined,
        });
    });
    cible.addEventListener('unhandledrejection', (evenement: Event) => {
        const raison = (evenement as PromiseRejectionEvent).reason;

        noter('promesse', {
            message:
                raison instanceof Error
                    ? `${raison.name}: ${raison.message}`
                    : String(raison),
            pile: raison instanceof Error ? raison.stack : undefined,
        });
    });

    return { noter, confier };
}
