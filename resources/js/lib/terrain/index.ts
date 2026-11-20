import { base, enregistrer, moteur } from '@/lib/hors-ligne';
import type { Acquittee, EntreeMeta } from '@/lib/hors-ligne/base';
import { listeProfils } from '@/lib/hors-ligne/profils';
import type { PackLocal } from '@/lib/hors-ligne/packs';
import { chargeAvis } from '@/lib/terrain/avis';
import type { EcranAvis, ReponseAvis } from '@/lib/terrain/avis';
import { codeDiagnostic, collecterDiagnostic } from '@/lib/terrain/diagnostic';
import type { Diagnostic } from '@/lib/terrain/diagnostic';
import { erreursGardees, installerCaptureErreurs } from '@/lib/terrain/erreurs';
import type { CaptureErreurs, TypeErreur } from '@/lib/terrain/erreurs';

/**
 * Lot 14 (terrain) : ce qui rend un essai mesurable, côté appareil —
 * capture des erreurs, diagnostic, « Ton avis ». Tout part par la file
 * (HORS_LIGNE.md A.3.5), donc hors ligne aussi.
 */

type RouteurTerrain = {
    on: (
        evenement: 'navigate',
        rappel: (e: { detail: { page: { version?: string | null } } }) => void,
    ) => unknown;
};

let versionCourante: string | null = null;
let capture: CaptureErreurs | null = null;

/** La version du build servi (celle d'Inertia) ; « dev » sous `npm run dev`. */
export function versionApplication(): string | null {
    return versionCourante;
}

export function noterErreur(
    type: TypeErreur,
    brute: { message?: unknown; source?: unknown; pile?: unknown },
): void {
    capture?.noter(type, brute);
}

export function demarrerTerrain(routeur: RouteurTerrain): void {
    if (capture !== null || typeof window === 'undefined') {
        return;
    }

    capture = installerCaptureErreurs({
        base,
        enregistrer,
        auteur: () => moteur.utilisateur,
        version: versionApplication,
    });

    // Un geste passé « À corriger » sur échec technique répété : la file
    // elle-même a un problème, l'équipe doit le savoir.
    moteur.on('anomalie', (anomalie) => {
        if (
            anomalie.genre === 'erreur' &&
            anomalie.type !== 'erreurs.signaler'
        ) {
            noterErreur('file', {
                message: `${anomalie.type} : ${anomalie.derniere_erreur ?? anomalie.motif}`,
            });
        }
    });

    let premiere = true;
    routeur.on('navigate', (evenement) => {
        versionCourante = evenement.detail.page.version || 'dev';

        // Les erreurs gardées d'un chargement précédent partent une fois
        // l'élève connu de la file.
        if (premiere) {
            premiere = false;
            setTimeout(() => void capture?.confier(), 5_000);
        }
    });
}

/* ---------- Diagnostic ---------- */

async function etatFile(): Promise<{
    en_attente: number;
    a_corriger: number;
    derniere_synchro: string | null;
    decalage_horloge_ms: number | null;
}> {
    const [enAttente, aCorriger, derniere, horloge] = await Promise.all([
        base.operations.count(),
        base.anomalies.count(),
        base.acquittees.orderBy('acquittee_le').last() as Promise<
            Acquittee | undefined
        >,
        base.meta.get('horloge') as Promise<EntreeMeta | undefined>,
    ]);
    const decalage = (horloge?.valeur as { decalage_ms?: number } | undefined)
        ?.decalage_ms;

    return {
        en_attente: enAttente,
        a_corriger: aCorriger,
        derniere_synchro: derniere?.acquittee_le ?? null,
        decalage_horloge_ms: typeof decalage === 'number' ? decalage : null,
    };
}

export function diagnostiquer(
    versionPage?: string | null,
): Promise<Diagnostic> {
    return collecterDiagnostic({
        version: () => versionApplication() ?? (versionPage || 'dev'),
        navigateur: () => navigator,
        fenetre: () => ({
            largeur: window.screen?.width ?? window.innerWidth,
            hauteur: window.screen?.height ?? window.innerHeight,
            autonome:
                window.matchMedia?.('(display-mode: standalone)').matches ===
                    true ||
                (navigator as { standalone?: boolean }).standalone === true,
            sombre: document.documentElement.classList.contains('dark'),
        }),
        file: etatFile,
        packs: async () => {
            const packs = (await base.packs.toArray()) as PackLocal[];

            return {
                nombre: packs.filter((p) => p.statut === 'complet').length,
                poids: packs.reduce((t, p) => t + (p.octets_recus ?? 0), 0),
            };
        },
        profils: async () => (await listeProfils(base)).length,
        erreurs: () => erreursGardees(base),
    });
}

export type DiagnosticEnvoye = { code: string; le: string };

const CLE_DERNIER = 'dernier_diagnostic';

/** Confie le diagnostic à la file ; le code s'affiche tout de suite. */
export async function envoyerDiagnostic(
    diagnostic: Diagnostic,
): Promise<DiagnosticEnvoye> {
    const envoye = { code: codeDiagnostic(), le: new Date().toISOString() };
    await enregistrer({
        type: 'diagnostic.envoyer',
        charge: { code: envoye.code, donnees: diagnostic },
        priorite: 9,
    });
    await base.ecrireMeta(CLE_DERNIER, envoye).catch(() => undefined);

    return envoye;
}

export async function dernierDiagnostic(): Promise<DiagnosticEnvoye | null> {
    try {
        return (await base.lireMeta<DiagnosticEnvoye>(CLE_DERNIER)) ?? null;
    } catch {
        return null;
    }
}

/* ---------- « Ton avis » ---------- */

export function donnerAvis(saisie: {
    ecran: EcranAvis;
    reponse: ReponseAvis;
    etiquettes: string[];
    commentaire: string;
}): Promise<string> {
    return enregistrer({
        type: 'avis.donner',
        charge: chargeAvis({ ...saisie, version: versionApplication() }),
        priorite: 8,
    });
}
