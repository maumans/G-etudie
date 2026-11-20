/**
 * Lot 14 (terrain) : l'état d'un appareil, lu sur l'appareil — il s'affiche
 * hors ligne aussi, c'est souvent là qu'on en a besoin. « Envoyer ce
 * diagnostic » le confie à la file (`diagnostic.envoyer`) avec un **code
 * court** choisi ici : l'équipe de terrain le note sur sa fiche et le
 * retrouve dans Console › Terrain.
 *
 * Rien de personnel : ni prénom, ni numéro, ni adresse ; le serveur ne garde
 * que les clés de TerrainService::CHAMPS_DIAGNOSTIC.
 */

export type Diagnostic = {
    version_app: string | null;
    service_worker:
        | 'actif'
        | 'en_attente'
        | 'installation'
        | 'absent'
        | 'indisponible';
    installee: boolean;
    stockage_utilise: number | null;
    stockage_quota: number | null;
    stockage_persistant: boolean | null;
    packs: number;
    packs_poids: number;
    en_attente: number;
    a_corriger: number;
    derniere_synchro: string | null;
    decalage_horloge_ms: number | null;
    profils: number;
    navigateur: string | null;
    systeme: string | null;
    memoire_go: number | null;
    coeurs: number | null;
    reseau: string | null;
    economie_donnees: boolean | null;
    ecran: string;
    theme: 'clair' | 'sombre';
    langue: string | null;
    erreurs_gardees: number;
};

/** Ce que lit l'appareil ; injecté pour les tests. */
export type SourcesDiagnostic = {
    version: () => string | null;
    navigateur: () => Pick<
        Navigator,
        | 'userAgent'
        | 'language'
        | 'hardwareConcurrency'
        | 'storage'
        | 'serviceWorker'
    > & {
        deviceMemory?: number;
        connection?: { effectiveType?: string; saveData?: boolean };
    };
    fenetre: () => {
        largeur: number;
        hauteur: number;
        autonome: boolean;
        sombre: boolean;
    };
    file: () => Promise<{
        en_attente: number;
        a_corriger: number;
        derniere_synchro: string | null;
        decalage_horloge_ms: number | null;
    }>;
    packs: () => Promise<{ nombre: number; poids: number }>;
    profils: () => Promise<number>;
    erreurs: () => Promise<number>;
};

/** Alphabet de Crockford sans I, L, O ni U : rien à confondre en recopiant. */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export function codeDiagnostic(
    aleatoire: (n: number) => Uint8Array = (n) =>
        crypto.getRandomValues(new Uint8Array(n)),
): string {
    return Array.from(aleatoire(6), (octet) => ALPHABET[octet % 32]).join('');
}

/** « Chrome 131 », « Android 11 » : d'après la chaîne d'agent. */
export function lireAgent(agent: string): {
    navigateur: string | null;
    systeme: string | null;
} {
    const version = (motif: RegExp) => agent.match(motif)?.[1] ?? null;
    const navigateur = (() => {
        for (const [nom, motif] of [
            ['Edge', /Edg\/(\d+)/],
            ['Opera', /OPR\/(\d+)/],
            ['Samsung Internet', /SamsungBrowser\/(\d+)/],
            ['Firefox', /Firefox\/(\d+)/],
            ['Chrome', /Chrome\/(\d+)/],
            ['Safari', /Version\/(\d+)[\d.]* .*Safari/],
        ] as const) {
            const v = version(motif);

            if (v) {
                return `${nom} ${v}`;
            }
        }

        return null;
    })();
    const android = version(/Android (\d+(?:\.\d+)?)/);
    const ios = version(/OS (\d+)_\d+[_\d]* like Mac OS X/);
    const systeme = android
        ? `Android ${android}`
        : ios
          ? `iOS ${ios}`
          : /Windows/.test(agent)
            ? 'Windows'
            : /Mac OS X/.test(agent)
              ? 'macOS'
              : /Linux/.test(agent)
                ? 'Linux'
                : null;

    return { navigateur, systeme };
}

export async function collecterDiagnostic(
    sources: SourcesDiagnostic,
): Promise<Diagnostic> {
    const nav = sources.navigateur();
    const fenetre = sources.fenetre();
    const agent = lireAgent(nav.userAgent);

    const [estimation, persistant, travailleur, file, packs, profils, erreurs] =
        await Promise.all([
            nav.storage?.estimate?.().catch(() => null) ?? null,
            nav.storage?.persisted?.().catch(() => null) ?? null,
            (async (): Promise<Diagnostic['service_worker']> => {
                if (!nav.serviceWorker) {
                    return 'indisponible';
                }

                try {
                    const inscription =
                        await nav.serviceWorker.getRegistration();

                    if (!inscription) {
                        return 'absent';
                    }

                    // Une version qui attend suppose une version active ;
                    // sans version active, c'est la première installation.
                    if (!inscription.active) {
                        return 'installation';
                    }

                    return inscription.waiting ? 'en_attente' : 'actif';
                } catch {
                    return 'indisponible';
                }
            })(),
            sources.file().catch(() => ({
                en_attente: 0,
                a_corriger: 0,
                derniere_synchro: null,
                decalage_horloge_ms: null,
            })),
            sources.packs().catch(() => ({ nombre: 0, poids: 0 })),
            sources.profils().catch(() => 0),
            sources.erreurs().catch(() => 0),
        ]);

    return {
        version_app: sources.version(),
        service_worker: travailleur,
        installee: fenetre.autonome,
        stockage_utilise: estimation?.usage ?? null,
        stockage_quota: estimation?.quota ?? null,
        stockage_persistant: persistant,
        packs: packs.nombre,
        packs_poids: packs.poids,
        en_attente: file.en_attente,
        a_corriger: file.a_corriger,
        derniere_synchro: file.derniere_synchro,
        decalage_horloge_ms: file.decalage_horloge_ms,
        profils,
        navigateur: agent.navigateur,
        systeme: agent.systeme,
        memoire_go: nav.deviceMemory ?? null,
        coeurs: nav.hardwareConcurrency ?? null,
        reseau: nav.connection?.effectiveType ?? null,
        economie_donnees: nav.connection?.saveData ?? null,
        ecran: `${fenetre.largeur}×${fenetre.hauteur}`,
        theme: fenetre.sombre ? 'sombre' : 'clair',
        langue: nav.language ?? null,
        erreurs_gardees: erreurs,
    };
}

/** Un nombre d'octets lisible : « 3,4 Mo », « 980 Ko ». */
export function formaterOctets(octets: number | null): string {
    if (octets === null) {
        return 'inconnu';
    }

    const format = (n: number) =>
        new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(n);

    if (octets >= 1e9) {
        return `${format(octets / 1e9)} Go`;
    }

    if (octets >= 1e6) {
        return `${format(octets / 1e6)} Mo`;
    }

    return `${format(Math.max(0, Math.round(octets / 1e3)))} Ko`;
}

/** « 6 min d'avance », « à l'heure » : l'écart avec l'horloge du serveur. */
export function formaterDecalage(ms: number | null): string {
    if (ms === null) {
        return 'pas encore mesuré';
    }

    const minutes = Math.round(Math.abs(ms) / 60_000);

    if (minutes < 2) {
        return 'à l’heure';
    }

    // Décalage = serveur − appareil : positif, l'appareil retarde.
    return `${minutes} min ${ms > 0 ? 'de retard' : 'd’avance'}`;
}

/** Ce qui demande l'attention de l'équipe de terrain, en clair. */
export function alertesDiagnostic(d: Diagnostic): string[] {
    const alertes: string[] = [];

    if (d.service_worker !== 'actif' && d.service_worker !== 'installation') {
        alertes.push(
            d.service_worker === 'en_attente'
                ? 'Une nouvelle version attend d’être activée.'
                : 'Le mode hors ligne n’est pas actif sur cet appareil.',
        );
    }

    if (d.a_corriger > 0) {
        alertes.push(`${d.a_corriger} geste(s) à corriger.`);
    }

    if (
        d.decalage_horloge_ms !== null &&
        Math.abs(d.decalage_horloge_ms) >= 5 * 60_000
    ) {
        alertes.push('L’heure du téléphone n’est pas juste.');
    }

    if (d.packs > 0 && d.stockage_persistant === false) {
        alertes.push(
            'Le stockage n’est pas protégé : le téléphone peut effacer les téléchargements.',
        );
    }

    if (
        d.stockage_quota !== null &&
        d.stockage_utilise !== null &&
        d.stockage_quota - d.stockage_utilise < 50e6
    ) {
        alertes.push('Il reste très peu de place sur le téléphone.');
    }

    return alertes;
}
