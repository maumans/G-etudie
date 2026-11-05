import { useSyncExternalStore } from 'react';
import { lirePageLocale } from '@/lib/contenu/source';
import { BaseHorsLigne } from '@/lib/hors-ligne/base';
import { copieDe } from '@/lib/hors-ligne/copies';
import { initialiserGardeNavigation } from '@/lib/hors-ligne/garde-navigation';
import type {
    MotifIndisponible,
    RouteurGarde,
} from '@/lib/hors-ligne/garde-navigation';
import { MoteurHorsLigne } from '@/lib/hors-ligne/moteur';
import { rangerInstantane, URL_INSTANTANE } from '@/lib/progression/locale';
import type { Instantane } from '@/lib/progression/locale';
import type {
    EtatHorsLigne,
    NouveauGeste,
    Transport,
} from '@/lib/hors-ligne/moteur';

/**
 * Point d'entrée du hors ligne côté application (HORS_LIGNE.md A.3.5) :
 *
 *   const uuid = await enregistrer({ type, charge, priorite, depend_de });
 *
 * **Tout geste élève passe par là**, en ligne comme hors ligne.
 */

export type { EtatHorsLigne, NouveauGeste } from '@/lib/hors-ligne/moteur';
export type { MotifIndisponible } from '@/lib/hors-ligne/garde-navigation';

/** Battement de connectivité : toutes les 20 s, application visible (A.11). */
export const BATTEMENT_MS = 20_000;

function lireCookie(nom: string): string | null {
    const trouve = document.cookie.match(new RegExp(`(?:^|; )${nom}=([^;]*)`));

    return trouve ? decodeURIComponent(trouve[1]) : null;
}

const transportFetch: Transport = async ({ methode, url, corps, entetes }) => {
    const xsrf = lireCookie('XSRF-TOKEN');
    const reponse = await fetch(url, {
        method: methode,
        credentials: 'same-origin',
        cache: 'no-store',
        headers: {
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            ...(corps !== undefined
                ? { 'Content-Type': 'application/json' }
                : {}),
            ...(xsrf ? { 'X-XSRF-TOKEN': xsrf } : {}),
            ...entetes,
        },
        ...(methode === 'POST' ? { body: JSON.stringify(corps ?? {}) } : {}),
    });

    return {
        statut: reponse.status,
        corps: await reponse.json().catch(() => null),
    };
};

export const base = new BaseHorsLigne();
export const moteur = new MoteurHorsLigne({ base, transport: transportFetch });

export const enregistrer = (geste: NouveauGeste): Promise<string> =>
    moteur.enregistrer(geste);

export function useHorsLigne(): EtatHorsLigne {
    return useSyncExternalStore(
        (rappel) => moteur.on('etat', rappel),
        () => moteur.etat,
        () => moteur.etat,
    );
}

/* ---------- Progression gardée sur l'appareil (HL4, A.10) ---------- */

const auditeursProgression = new Set<() => void>();

/** Rappelé quand un nouvel instantané a été rangé. */
export function surProgression(rappel: () => void): () => void {
    auditeursProgression.add(rappel);

    return () => auditeursProgression.delete(rappel);
}

let instantaneEnCours: Promise<boolean> | null = null;

/**
 * Lit `GET /eleve/instantane` (dernière jauge, série, trois séances
 * préparées) et le range pour le profil actif. Silencieux en cas d'échec :
 * l'appareil garde l'instantané précédent.
 */
export function rafraichirInstantane(): Promise<boolean> {
    const auteur = moteur.utilisateur;

    if (auteur === null) {
        return Promise.resolve(false);
    }

    instantaneEnCours ??= (async () => {
        try {
            const reponse = await transportFetch({
                methode: 'GET',
                url: URL_INSTANTANE,
            });

            if (reponse.statut !== 200 || reponse.corps === null) {
                return false;
            }

            await rangerInstantane(base, auteur, reponse.corps as Instantane);
            auditeursProgression.forEach((rappel) => rappel());

            return true;
        } catch {
            return false;
        } finally {
            instantaneEnCours = null;
        }
    })();

    return instantaneEnCours;
}

/* ---------- Dialogue « écran indisponible » (monté une fois à la racine) ---------- */

let motifOuvert: MotifIndisponible | null = null;
const auditeursDialogue = new Set<() => void>();

export function ouvrirEcranIndisponible(motif: MotifIndisponible | null): void {
    motifOuvert = motif;
    auditeursDialogue.forEach((rappel) => rappel());
}

export function useEcranIndisponible(): MotifIndisponible | null {
    return useSyncExternalStore(
        (rappel) => {
            auditeursDialogue.add(rappel);

            return () => auditeursDialogue.delete(rappel);
        },
        () => motifOuvert,
        () => null,
    );
}

/* ---------- Installation (A.3.2) ---------- */

type InviteInstallation = Event & { prompt: () => Promise<void> };

let invite: InviteInstallation | null = null;
const auditeursInstallation = new Set<() => void>();

export function estIphone(): boolean {
    return /iPhone|iPad|iPod/.test(navigator.userAgent);
}

export function estInstallee(): boolean {
    return (
        window.matchMedia?.('(display-mode: standalone)').matches === true ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true
    );
}

/** Le bouton « Installer » n'existe que si le navigateur l'a proposé. */
export function useInviteInstallation(): {
    possible: boolean;
    installer: () => Promise<void>;
} {
    const possible = useSyncExternalStore(
        (rappel) => {
            auditeursInstallation.add(rappel);

            return () => auditeursInstallation.delete(rappel);
        },
        () => invite !== null,
        () => false,
    );

    return {
        possible,
        installer: async () => {
            await invite?.prompt();
            invite = null;
            auditeursInstallation.forEach((rappel) => rappel());
        },
    };
}

/* ---------- Service worker (A.3.1) ---------- */

async function enregistrerServiceWorker(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
        return;
    }

    // Sous `npm run dev`, /sw.js se désinstalle : inutile de l'inscrire.
    if (import.meta.env.DEV) {
        return;
    }

    if (!window.isSecureContext) {
        console.info(
            "[N'karamögö] Mode hors ligne indisponible : le site doit être servi en HTTPS.",
        );

        return;
    }

    try {
        const inscription = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
        });

        // Une nouvelle version n'est activée que file vide et sans examen
        // blanc en cours : jamais de bascule pendant un examen.
        const essayerActiver = async () => {
            // Lu une fois : après l'attente, `waiting` a pu changer.
            const enAttente = inscription.waiting;

            if (
                enAttente &&
                moteur.etat.enAttente === 0 &&
                (await base.examens_blancs.count()) === 0
            ) {
                enAttente.postMessage({ type: 'ACTIVER' });
            }
        };

        inscription.addEventListener('updatefound', () => {
            inscription.installing?.addEventListener(
                'statechange',
                () => void essayerActiver(),
            );
        });
        moteur.on('etat', () => void essayerActiver());
        void essayerActiver();
        setInterval(() => void inscription.update(), 3600_000);
    } catch (erreur) {
        console.warn("[N'karamögö] Service worker non inscrit :", erreur);
    }
}

function posterAuServiceWorker(message: Record<string, unknown>): void {
    navigator.serviceWorker?.controller?.postMessage(message);
}

/** À la déconnexion : la copie des écrans de ce compte est effacée. */
export function oublierCopies(id: number): void {
    posterAuServiceWorker({ type: 'DECONNEXION', id });
}

/* ---------- Démarrage ---------- */

type PageObservee = {
    component: string;
    url: string;
    props: {
        auth?: { user?: { id: number; espaces: string[] } | null };
        hors_ligne_pages?: string[];
        copie_hors_ligne?: string;
    };
};

type RouteurHorsLigne = RouteurGarde & {
    on(
        evenement: 'navigate',
        rappel: (evenement: { detail: { page: PageObservee } }) => void,
    ): () => void;
    reload(): void;
    push(visite: {
        url: string;
        component: string;
        props: (actuelles: Record<string, unknown>) => Record<string, unknown>;
    }): void;
};

let pages: string[] = [];
let compteConnecte: number | null = null;

/**
 * Copie servie au chargement du document : le service worker y a glissé son
 * heure dans une balise meta, lue une fois puis retirée (elle survivrait
 * sinon aux navigations suivantes).
 */
let copieDocument: { url: string; heure: string } | null = null;
let pageCourante: { component: string; copie: string | null } | null = null;

export function copieDuDocument(url: string): string | null {
    return copieDocument?.url === url ? copieDocument.heure : null;
}

/**
 * À appeler une fois, avant la barre de progression : garde de navigation,
 * profil actif, battement, service worker.
 */
let routeurActif: RouteurHorsLigne | null = null;

/**
 * Affiche un écran depuis la base locale (pack, séance préparée), avec les
 * props mêmes du serveur (A.4). `false` : il n'y est pas.
 */
export async function afficherDepuisLaBase(chemin: string): Promise<boolean> {
    const page = await lirePageLocale(base, chemin);

    if (page === null || routeurActif === null) {
        return false;
    }

    routeurActif.push({
        url: chemin,
        component: page.component,
        props: (actuelles) => ({
            ...actuelles,
            ...page.props,
            source: 'pack',
        }),
    });

    return true;
}

export function demarrerHorsLigne(routeur: RouteurHorsLigne): void {
    routeurActif = routeur;
    initialiserGardeNavigation(routeur, {
        horsLigne: () => moteur.etat.reseau === 'hors_ligne',
        pages: () => pages,
        ouvrir: ouvrirEcranIndisponible,
        signalerHorsLigne: () => moteur.signalerHorsLigne(),
        // Un contenu téléchargé (pack) s'affiche sans réseau, avec les props
        // mêmes du serveur (HORS_LIGNE.md A.4).
        afficherLocal: (url) => afficherDepuisLaBase(url.pathname),
    });

    routeur.on('navigate', (evenement) => {
        const { component, url, props } = evenement.detail.page;
        const user = props.auth?.user ?? null;
        pages = props.hors_ligne_pages ?? pages;
        let copie = props.copie_hors_ligne ?? null;
        const balise = document.querySelector('meta[name="copie-hors-ligne"]');

        if (balise) {
            copieDocument = {
                url,
                heure: balise.getAttribute('content') ?? '',
            };
            balise.remove();
            copie = copieDocument.heure;
        } else if (copie === null) {
            copieDocument = null;
        }

        pageCourante = { component, copie };

        // Une copie servie dit que le réseau a manqué ; une page du serveur,
        // qu'il est là. Avant `definirUtilisateur`, dont le premier contact
        // marquera le retour du réseau.
        if (copie !== null) {
            moteur.signalerHorsLigne();
        } else {
            moteur.signalerEnLigne();
        }

        // La file n'a de sens que pour un élève (niveau A, A.2).
        void moteur.definirUtilisateur(
            user && user.espaces.includes('eleve') ? user.id : null,
        );

        compteConnecte = user?.id ?? null;

        if (user) {
            posterAuServiceWorker({ type: 'UTILISATEUR', id: user.id });
        }
    });

    // Au retour du réseau, un écran de lecture montré d'après sa copie
    // s'actualise seul, une fois par retour (A.3.8) ; un écran de saisie ne
    // bouge jamais. Écouteur synchrone : aucun rendu React ne peut sauter la
    // transition.
    let reseauPrecedent = moteur.etat.reseau;
    moteur.on('etat', ({ reseau }) => {
        const revient = reseauPrecedent !== 'en_ligne' && reseau === 'en_ligne';
        reseauPrecedent = reseau;

        if (
            revient &&
            pageCourante?.copie &&
            copieDe(pageCourante.component).lecture
        ) {
            routeur.reload();
        }
    });

    // HL4 : la file vient de se vider, le serveur a tout compté — on
    // reprend la jauge, la série et les séances préparées à jour.
    let enAttentePrecedent = moteur.etat.enAttente;
    moteur.on('etat', ({ reseau, enAttente }) => {
        const videe = enAttentePrecedent > 0 && enAttente === 0;
        enAttentePrecedent = enAttente;

        if (videe && reseau === 'en_ligne') {
            void rafraichirInstantane();
        }
    });

    const battre = () => {
        if (
            document.visibilityState === 'visible' &&
            moteur.utilisateur !== null
        ) {
            void moteur.rafraichirEtat();
        }
    };

    setInterval(battre, BATTEMENT_MS);
    window.addEventListener('online', () => {
        battre();
        moteur.reveiller();
    });
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            battre();
            moteur.reveiller();
        }
    });

    window.addEventListener('beforeinstallprompt', (evenement) => {
        evenement.preventDefault();
        invite = evenement as InviteInstallation;
        auditeursInstallation.forEach((rappel) => rappel());
    });

    // Première page : le worker ne contrôle peut-être pas encore l'onglet.
    void navigator.serviceWorker?.ready.then((inscription) => {
        if (compteConnecte !== null) {
            inscription.active?.postMessage({
                type: 'UTILISATEUR',
                id: compteConnecte,
            });
        }
    });
    void enregistrerServiceWorker();
}
