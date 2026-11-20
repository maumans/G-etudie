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
import {
    annonceDesPacks,
    demanderStockagePersistant,
    libererPack,
    matieresTelechargees,
    noterEtatDesPacks,
    packsPresents,
    supprimerPack,
    telechargerPack,
} from '@/lib/hors-ligne/packs';
import type { PackLocal, Progression } from '@/lib/hors-ligne/packs';
import {
    connaitreProfil,
    jetonsDesProfils,
    listeProfils,
    oublierProfil,
    profilLocal,
    rangerJeton,
    verifierCode,
} from '@/lib/hors-ligne/profils';
import type { ProfilLocal, VerdictCode } from '@/lib/hors-ligne/profils';
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

/*
 * Changer de profil régénère la session du serveur. Une requête partie
 * avant, avec l'ancien cookie, reviendrait avec un cookie de session vide
 * qui écraserait le nouveau : le téléphone se retrouverait déconnecté
 * (trouvé par `parcours-lot7.spec.ts`). Pendant un changement de profil, les
 * requêtes de l'application attendent, et le changement attend que celles
 * déjà parties soient revenues.
 */
let requetesEnVol = 0;
let porteSession: Promise<void> | null = null;
const quandToutEstRevenu: (() => void)[] = [];

const transportFetch: Transport = async (requete) => {
    while (porteSession) {
        await porteSession;
    }

    requetesEnVol++;

    try {
        return await envoyerRequete(requete);
    } finally {
        requetesEnVol--;

        if (requetesEnVol === 0) {
            quandToutEstRevenu.splice(0).forEach((reprendre) => reprendre());
        }
    }
};

/** Une requête seule sur le réseau de l'application (changement de session). */
async function seule<T>(geste: () => Promise<T>): Promise<T> {
    while (porteSession) {
        await porteSession;
    }

    let ouvrir: () => void = () => {};
    porteSession = new Promise((resoudre) => {
        ouvrir = resoudre;
    });

    try {
        if (requetesEnVol > 0) {
            await new Promise<void>((resoudre) =>
                quandToutEstRevenu.push(resoudre),
            );
        }

        return await geste();
    } finally {
        porteSession = null;
        ouvrir();
    }
}

const envoyerRequete: Transport = async ({ methode, url, corps, entetes }) => {
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

/** Ordinateur partagé (HL-D9) : rien n'est gardé, ni profil, ni pack, ni copie. */
let appareilPartage = false;

/**
 * Le compte de la session du serveur (HL6) : d'après la dernière page venue
 * du serveur ou le dernier battement. Il peut différer du profil actif sur
 * l'appareil (changé hors ligne), tant que la session n'a pas suivi.
 */
let sessionServeur: number | null = null;

export const moteur: MoteurHorsLigne = new MoteurHorsLigne({
    base,
    transport: transportFetch,
    // Le battement porte le jeton du profil connecté et les packs présents ;
    // il rapporte un jeton neuf et les versions qui ont changé (A.5, A.7).
    entetesEtat: async (): Promise<Record<string, string>> => {
        // Le jeton du compte de la session, jamais celui d'un autre profil :
        // le serveur le comparerait à celui de la session et en remettrait
        // un neuf.
        const id: number | null = sessionServeur;
        const profil = id === null ? null : await profilLocal(base, id);
        const annonce = annonceDesPacks(await packsPresents(base));

        return {
            ...(profil?.jeton ? { 'X-Profil': profil.jeton } : {}),
            ...(annonce !== '' ? { 'X-Packs': annonce } : {}),
        };
    },
    apresEtat: async (corps): Promise<void> => {
        // Le jeton remis est celui du compte que le serveur nomme.
        const utilisateur = corps.utilisateur as { id?: unknown } | undefined;
        const id: number | null =
            typeof utilisateur?.id === 'number' ? utilisateur.id : null;
        sessionServeur = id;

        if (
            typeof corps.jeton_profil === 'string' &&
            id !== null &&
            !appareilPartage &&
            (await profilLocal(base, id)) !== null
        ) {
            await rangerJeton(base, id, corps.jeton_profil);
        }

        if (corps.packs && typeof corps.packs === 'object') {
            await noterEtatDesPacks(
                base,
                corps.packs as Parameters<typeof noterEtatDesPacks>[1],
            );
            signalerPacks();
        }
    },
    jetonsProfils: async () => (appareilPartage ? {} : jetonsDesProfils(base)),
});

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
            // Lot 7 : trois séances de plus par matière téléchargée (A.10).
            const matieres = await matieresTelechargees(base);
            const reponse = await transportFetch({
                methode: 'GET',
                url:
                    matieres.length > 0
                        ? `${URL_INSTANTANE}?matieres=${encodeURIComponent(matieres.join(','))}`
                        : URL_INSTANTANE,
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

/* ---------- Packs (HL5, A.5) ---------- */

const auditeursPacks = new Set<() => void>();

function signalerPacks(): void {
    auditeursPacks.forEach((rappel) => rappel());
}

/** Rappelé quand un pack a changé sur l'appareil (téléchargé, supprimé, annoncé). */
export function surPacks(rappel: () => void): () => void {
    auditeursPacks.add(rappel);

    return () => auditeursPacks.delete(rappel);
}

export async function lirePacksLocaux(): Promise<PackLocal[]> {
    try {
        return (await base.packs.toArray()) as PackLocal[];
    } catch {
        return [];
    }
}

const telechargementsEnCours = new Map<string, Promise<PackLocal>>();

/**
 * Télécharge, reprend ou met à jour un pack (toujours à la demande de
 * l'élève). Après le premier pack, le stockage est demandé persistant.
 */
export function telecharger(
    cle: string,
    options: {
        premier?: boolean;
        surProgression?: (p: Progression) => void;
    } = {},
): Promise<PackLocal> {
    const enCours = telechargementsEnCours.get(cle);

    if (enCours) {
        return enCours;
    }

    const promesse = (async () => {
        try {
            const pack = await telechargerPack(base, transportFetch, cle, {
                ...options,
                surProgression: (progression) => {
                    options.surProgression?.(progression);
                    signalerPacks();
                },
            });
            await demanderStockagePersistant();
            // Les séances préparées de cette matière, tout de suite.
            void rafraichirInstantane();

            return pack;
        } finally {
            telechargementsEnCours.delete(cle);
            signalerPacks();
        }
    })();
    telechargementsEnCours.set(cle, promesse);

    return promesse;
}

/** Supprime le pack du téléphone ; en ligne, la place gratuite se libère. */
export async function supprimer(cle: string): Promise<boolean> {
    await supprimerPack(base, cle);
    signalerPacks();

    return libererPack(transportFetch, cle);
}

/* ---------- Profils du téléphone (HL6, A.7) ---------- */

const auditeursProfils = new Set<() => void>();

function signalerProfils(): void {
    auditeursProfils.forEach((rappel) => rappel());
}

export function surProfils(rappel: () => void): () => void {
    auditeursProfils.add(rappel);

    return () => auditeursProfils.delete(rappel);
}

export function lireProfils(): Promise<ProfilLocal[]> {
    return listeProfils(base);
}

export function estAppareilPartage(): boolean {
    return appareilPartage;
}

export { signalerProfils };

const CLE_BASCULE = 'bascule_en_attente';

export type ResultatBascule =
    | { ok: true }
    | { ok: false; raison: 'code'; verdict: VerdictCode }
    | { ok: false; raison: 'reconnexion'; message: string };

/**
 * Passer à un autre profil du téléphone : le code local d'abord, puis le
 * serveur ouvre sa session (jeton de profil). Hors ligne, le profil devient
 * actif sur l'appareil (copies de ses écrans, sa file) et la session suivra
 * au retour du réseau.
 */
export async function basculerVersProfil(
    id: number,
    code: string,
): Promise<ResultatBascule> {
    const verdict = await verifierCode(base, id, code);

    if (!verdict.ok) {
        signalerProfils();

        return { ok: false, raison: 'code', verdict };
    }

    const profil = await profilLocal(base, id);
    const appareil = await base.lireMeta<string | null>('appareil');

    if (!profil?.jeton || !appareil) {
        return {
            ok: false,
            raison: 'reconnexion',
            message:
                'Ce profil doit se reconnecter une fois avec son mot de passe.',
        };
    }

    try {
        const reponse = await seule(() =>
            envoyerRequete({
                methode: 'POST',
                url: '/appareil/profils/basculer',
                corps: { appareil, profil: id, jeton: profil.jeton },
            }),
        );

        if (reponse.statut === 422) {
            await base.profils.update(id, { jeton: null });

            return {
                ok: false,
                raison: 'reconnexion',
                message: 'Ce profil doit se reconnecter avec son mot de passe.',
            };
        }

        if (reponse.statut === 200) {
            await base.ecrireMeta(CLE_BASCULE, null);
            window.location.assign('/eleve');

            return { ok: true };
        }
    } catch {
        // Hors ligne : le profil devient actif sur l'appareil seulement.
    }

    await base.ecrireMeta(CLE_BASCULE, id);
    await posterEtAttendre({ type: 'UTILISATEUR', id });
    window.location.assign('/eleve');

    return { ok: true };
}

/**
 * Le profil quitte ce téléphone (« Se déconnecter ») : son jeton est retiré
 * côté serveur, ses données locales effacées une fois sa file vide.
 */
export async function retirerProfilDuTelephone(id: number): Promise<void> {
    const appareil = await base.lireMeta<string | null>('appareil');

    if (appareil) {
        await transportFetch({
            methode: 'POST',
            url: '/appareil/profils/retirer',
            corps: { appareil },
        }).catch(() => null);
    }

    await oublierProfil(base, id).catch(() => {});
    signalerProfils();
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
        // Sans réseau, la vérification échoue : rien à faire, elle reprend
        // dans une heure (rejet non rattrapé trouvé par la capture d'erreurs
        // du lot 14).
        setInterval(
            () => void inscription.update().catch(() => undefined),
            3600_000,
        );
    } catch (erreur) {
        console.warn("[N'karamögö] Service worker non inscrit :", erreur);
    }
}

function posterAuServiceWorker(message: Record<string, unknown>): void {
    navigator.serviceWorker?.controller?.postMessage(message);
}

/**
 * Sans réseau, d'après ce qu'on sait : l'échec d'une requête (moteur), ou le
 * navigateur qui se sait coupé (mode avion). `navigator.onLine` ne ment que
 * dans l'autre sens (A.3.9) : il ne sert jamais à se croire en ligne.
 */
export function horsLigneSur(): boolean {
    return (
        moteur.etat.reseau === 'hors_ligne' ||
        (typeof navigator !== 'undefined' && navigator.onLine === false)
    );
}

/** Envoie un message au service worker et attend qu'il l'ait rangé (1 s au plus). */
function posterEtAttendre(message: Record<string, unknown>): Promise<void> {
    const controleur = navigator.serviceWorker?.controller;

    if (!controleur) {
        return Promise.resolve();
    }

    return new Promise((resoudre) => {
        const canal = new MessageChannel();
        const fin = setTimeout(resoudre, 1000);
        canal.port1.onmessage = () => {
            clearTimeout(fin);
            resoudre();
        };
        controleur.postMessage(message, [canal.port2]);
    });
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
        auth?: {
            user?: {
                id: number;
                prenom?: string;
                pseudo?: string;
                espaces: string[];
            } | null;
        };
        hors_ligne_pages?: string[];
        copie_hors_ligne?: string;
        appareil_partage?: boolean;
        /** `pack` : props lues dans la base locale (A.4), pas du serveur. */
        source?: string;
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

const auditeursCopie = new Set<() => void>();

/**
 * L'heure de la copie du document, observée : le premier rendu de la page
 * précède le relevé de la balise, le bandeau se redessine quand elle est
 * connue (lot 7 : il ne pouvait plus compter sur le passage « hors ligne »,
 * désormais signalé dès l'événement `offline`).
 */
export function useCopieDuDocument(url: string): string | null {
    return useSyncExternalStore(
        (rappel) => {
            auditeursCopie.add(rappel);

            return () => auditeursCopie.delete(rappel);
        },
        () => copieDuDocument(url),
        () => null,
    );
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
    const id = moteur.utilisateur;
    const prefere =
        id === null
            ? null
            : ((await profilLocal(base, id))?.pack_prefere ?? null);
    const page = await lirePageLocale(base, chemin, { prefere });

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

/**
 * Le profil de la page et celui du téléphone (HL6) :
 *  - un élève connecté est connu du téléphone (sauf ordinateur partagé) ;
 *  - un changement de profil fait hors ligne attend le réseau : la première
 *    page venue du serveur (pas d'une copie) sous une autre session ouvre
 *    celle du profil choisi, puis recharge ;
 *  - une page de connexion annule ce changement en attente (on se connecte
 *    avec un mot de passe : c'est ce compte-là qui compte).
 */
async function suivreLeProfil(
    component: string,
    user: {
        id: number;
        prenom?: string;
        pseudo?: string;
        espaces: string[];
    } | null,
    depuisUneCopie: boolean,
): Promise<void> {
    try {
        if (component.startsWith('auth/')) {
            await base.ecrireMeta(CLE_BASCULE, null);

            return;
        }

        if (!user || !user.espaces.includes('eleve')) {
            return;
        }

        if (!appareilPartage) {
            await connaitreProfil(base, {
                id: user.id,
                prenom: user.prenom ?? '',
                pseudo: user.pseudo ?? '',
            });
            signalerProfils();

            // Le premier battement a pu remettre le jeton de profil avant
            // que le profil soit rangé ici : on le redemande.
            if (!depuisUneCopie && !(await profilLocal(base, user.id))?.jeton) {
                await moteur.rafraichirEtat();
            }
        }

        const enAttente = await base.lireMeta<number | null>(CLE_BASCULE);

        if (enAttente === null || enAttente === undefined) {
            return;
        }

        if (enAttente === user.id) {
            if (!depuisUneCopie) {
                await base.ecrireMeta(CLE_BASCULE, null);
            }

            return;
        }

        if (!depuisUneCopie) {
            await appliquerBascule(user.id);
        }
    } catch {
        // Base indisponible ou réseau perdu : on réessaiera à la page suivante.
    }
}

/**
 * Le profil choisi hors ligne devient la session du serveur (jeton de
 * profil), dès que le réseau le permet. La page n'est rechargée que si elle
 * montre un autre compte que lui (une séance en cours reste à l'écran).
 */
let basculeEnCours: Promise<void> | null = null;

/**
 * Un seul changement de session à la fois : le retour du réseau et la
 * première page venue du serveur le demandent souvent ensemble, et deux
 * régénérations de session concurrentes pouvaient laisser le navigateur
 * sans session (trouvé par `parcours-lot7.spec.ts`).
 */
function appliquerBascule(comptePage: number | null): Promise<void> {
    basculeEnCours ??= executerBascule(comptePage).finally(() => {
        basculeEnCours = null;
    });

    return basculeEnCours;
}

async function executerBascule(comptePage: number | null): Promise<void> {
    const enAttente = await base.lireMeta<number | null>(CLE_BASCULE);

    if (enAttente === null || enAttente === undefined) {
        return;
    }

    const profil = await profilLocal(base, enAttente);
    const appareil = await base.lireMeta<string | null>('appareil');

    if (!profil?.jeton || !appareil) {
        await base.ecrireMeta(CLE_BASCULE, null);

        return;
    }

    try {
        const reponse = await seule(() =>
            envoyerRequete({
                methode: 'POST',
                url: '/appareil/profils/basculer',
                corps: { appareil, profil: enAttente, jeton: profil.jeton },
            }),
        );

        if (reponse.statut === 200 || reponse.statut === 422) {
            await base.ecrireMeta(CLE_BASCULE, null);
        }

        if (reponse.statut === 200) {
            // Nouvelle session : jeton CSRF neuf, puis la file repart.
            await moteur.rafraichirEtat();
            moteur.reveiller();

            if (comptePage !== enAttente) {
                window.location.reload();
            }
        }
    } catch {
        // Toujours sans réseau : on réessaiera au prochain retour.
    }
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
        afficherLocal: (url) => afficherDepuisLaBase(url.pathname + url.search),
    });

    routeur.on('navigate', (evenement) => {
        const { component, url, props } = evenement.detail.page;
        const user = props.auth?.user ?? null;
        pages = props.hors_ligne_pages ?? pages;
        appareilPartage = props.appareil_partage === true;
        let copie = props.copie_hors_ligne ?? null;
        const balise = document.querySelector('meta[name="copie-hors-ligne"]');

        if (balise) {
            copieDocument = {
                url,
                heure: balise.getAttribute('content') ?? '',
            };
            balise.remove();
            copie = copieDocument.heure;
            auditeursCopie.forEach((rappel) => rappel());
        } else if (copie === null && copieDocument?.url === url) {
            // Retour arrière vers la page du document servi d'après sa
            // copie : ses props n'ont pas l'heure (elle venait de la balise).
            copie = copieDocument.heure;
        } else if (copie === null) {
            copieDocument = null;
        }

        pageCourante = { component, copie };

        // Rechargé hors ligne sur un écran jamais copié (leçon ou séance
        // ouvertes depuis un pack) : le service worker a servi l'accueil,
        // marqué de l'adresse voulue ; on la rouvre depuis la base locale.
        const ecranLocal = document.querySelector('meta[name="ecran-local"]');

        if (ecranLocal) {
            const chemin = ecranLocal.getAttribute('content') ?? '';
            ecranLocal.remove();

            void afficherDepuisLaBase(chemin).then((trouve) => {
                if (!trouve) {
                    ouvrirEcranIndisponible('pas_encore_ouvert');
                }
            });
        }

        // Une copie servie dit que le réseau a manqué ; une page du serveur,
        // qu'il est là. Avant `definirUtilisateur`, dont le premier contact
        // marquera le retour du réseau.
        // Une page lue dans la base locale (pack, séance préparée) ne dit
        // rien du réseau.
        if (copie !== null) {
            moteur.signalerHorsLigne();
        } else if (props.source !== 'pack') {
            moteur.signalerEnLigne();
        }

        // La file n'a de sens que pour un élève (niveau A, A.2).
        if (copie === null && props.source !== 'pack') {
            sessionServeur = user?.id ?? null;
        }

        void moteur.definirUtilisateur(
            user && user.espaces.includes('eleve') ? user.id : null,
        );

        compteConnecte = user?.id ?? null;

        if (user) {
            posterAuServiceWorker({
                type: 'UTILISATEUR',
                id: user.id,
                garder: !appareilPartage,
            });
        }

        void suivreLeProfil(component, user, copie !== null);
    });

    // Au retour du réseau, un écran de lecture montré d'après sa copie
    // s'actualise seul, une fois par retour (A.3.8) ; un écran de saisie ne
    // bouge jamais. Écouteur synchrone : aucun rendu React ne peut sauter la
    // transition.
    let reseauPrecedent = moteur.etat.reseau;
    moteur.on('etat', ({ reseau }) => {
        const revient = reseauPrecedent !== 'en_ligne' && reseau === 'en_ligne';
        reseauPrecedent = reseau;

        if (!revient) {
            return;
        }

        // L'écran de lecture est décidé maintenant (synchrone, A.3.8), mais
        // rechargé après le changement de session éventuel (HL6 : un profil
        // choisi hors ligne reprend sa session) : jamais deux requêtes de
        // session en même temps.
        const recharger =
            pageCourante?.copie && copieDe(pageCourante.component).lecture;

        void appliquerBascule(compteConnecte).then(() => {
            if (recharger) {
                routeur.reload();
            }
        });
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
    // Lot 7 : le navigateur sait qu'il n'a plus de réseau (mode avion) ;
    // `navigator.onLine` ment seulement dans l'autre sens (A.3.9). Sans cela,
    // le premier geste après la coupure partait vers le serveur au lieu
    // d'ouvrir la séance gardée sur le téléphone.
    window.addEventListener('offline', () => moteur.signalerHorsLigne());

    if (navigator.onLine === false) {
        moteur.signalerHorsLigne();
    }
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
