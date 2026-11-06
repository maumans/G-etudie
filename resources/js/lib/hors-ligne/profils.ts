import type { BaseHorsLigne } from '@/lib/hors-ligne/base';

/**
 * Les profils du téléphone (HORS_LIGNE.md A.7, HL6, HL-D9).
 *
 * - **4 profils au plus**, chacun protégé par un **code local à 4 chiffres**
 *   (empreinte PBKDF2 salée, jamais le code lui-même) : il protège l'accès
 *   entre frères et sœurs, sans mot de passe ni réseau.
 * - Après **5 erreurs**, une attente qui double à chaque erreur (30 s, 1 min,
 *   2 min…, 15 min au plus). Code oublié : se reconnecter avec le mot de
 *   passe (réseau).
 * - Le **jeton de profil** remis par le serveur (`GET /sync/etat`) est gardé
 *   ici : il ouvre la session de ce profil (`POST /appareil/profils/basculer`)
 *   et accompagne ses réponses quand la session est celle d'un autre.
 * - Retirer un profil efface ses données locales une fois sa file vide ; les
 *   packs restent (partagés).
 *
 * Ce fichier n'importe ni React ni Inertia, pour rester testable.
 */

export const PROFILS_MAX = 4;
export const ESSAIS_LIBRES = 5;
const ATTENTE_INITIALE_MS = 30_000;
const ATTENTE_MAX_MS = 15 * 60_000;
const ITERATIONS = 100_000;

export type CodeLocal = { sel: string; empreinte: string; iterations: number };

export type ProfilLocal = {
    id: number;
    prenom: string;
    pseudo: string;
    jeton: string | null;
    code: CodeLocal | null;
    essais: number;
    bloque_jusqu: number | null;
    ajoute_le: string;
    vu_le: string;
    /** Le dernier pack ouvert par ce profil (deux packs de la même matière). */
    pack_prefere?: string | null;
};

type Base = Pick<
    BaseHorsLigne,
    | 'profils'
    | 'operations'
    | 'anomalies'
    | 'acquittees'
    | 'progression'
    | 'seances'
    | 'examens_blancs'
    | 'brouillons'
    | 'contenus'
    | 'transaction'
>;

function hex(octets: ArrayBuffer | Uint8Array): string {
    return [...new Uint8Array(octets)]
        .map((octet) => octet.toString(16).padStart(2, '0'))
        .join('');
}

export function codeValide(code: string): boolean {
    return /^\d{4}$/.test(code);
}

async function empreinteDe(
    code: string,
    sel: string,
    iterations: number,
): Promise<string> {
    const cle = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(code),
        'PBKDF2',
        false,
        ['deriveBits'],
    );
    const bits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            hash: 'SHA-256',
            salt: new TextEncoder().encode(sel),
            iterations,
        },
        cle,
        256,
    );

    return hex(bits);
}

export async function listeProfils(
    base: Pick<BaseHorsLigne, 'profils'>,
): Promise<ProfilLocal[]> {
    try {
        return ((await base.profils.toArray()) as ProfilLocal[]).sort((a, b) =>
            a.ajoute_le.localeCompare(b.ajoute_le),
        );
    } catch {
        return [];
    }
}

export async function profilLocal(
    base: Pick<BaseHorsLigne, 'profils'>,
    id: number,
): Promise<ProfilLocal | null> {
    try {
        return (
            ((await base.profils.get(id)) as ProfilLocal | undefined) ?? null
        );
    } catch {
        return null;
    }
}

/**
 * Le profil connecté est connu du téléphone (prénom et pseudo à jour) ; il
 * n'est **gardé** dans la liste « Qui révise ? » qu'une fois son code choisi.
 * `false` : déjà 4 profils.
 */
export async function connaitreProfil(
    base: Pick<BaseHorsLigne, 'profils'>,
    profil: { id: number; prenom: string; pseudo: string },
    maintenant: Date = new Date(),
): Promise<boolean> {
    const existant = await profilLocal(base, profil.id);

    if (existant) {
        await base.profils.update(profil.id, {
            prenom: profil.prenom,
            pseudo: profil.pseudo,
            vu_le: maintenant.toISOString(),
        });

        return true;
    }

    if ((await base.profils.count()) >= PROFILS_MAX) {
        return false;
    }

    await base.profils.put({
        id: profil.id,
        prenom: profil.prenom,
        pseudo: profil.pseudo,
        jeton: null,
        code: null,
        essais: 0,
        bloque_jusqu: null,
        ajoute_le: maintenant.toISOString(),
        vu_le: maintenant.toISOString(),
    } satisfies ProfilLocal);

    return true;
}

export async function rangerJeton(
    base: Pick<BaseHorsLigne, 'profils'>,
    id: number,
    jeton: string,
): Promise<void> {
    await base.profils.update(id, { jeton });
}

/** Les jetons des profils du téléphone (pour la file, HL6). */
export async function jetonsDesProfils(
    base: Pick<BaseHorsLigne, 'profils'>,
): Promise<Record<number, string>> {
    const jetons: Record<number, string> = {};

    for (const profil of await listeProfils(base)) {
        if (profil.jeton) {
            jetons[profil.id] = profil.jeton;
        }
    }

    return jetons;
}

export async function definirCode(
    base: Pick<BaseHorsLigne, 'profils'>,
    id: number,
    code: string,
): Promise<void> {
    if (!codeValide(code)) {
        throw new Error('Le code a 4 chiffres.');
    }

    const sel = hex(crypto.getRandomValues(new Uint8Array(16)));
    await base.profils.update(id, {
        code: {
            sel,
            empreinte: await empreinteDe(code, sel, ITERATIONS),
            iterations: ITERATIONS,
        },
        essais: 0,
        bloque_jusqu: null,
    });
}

export type VerdictCode =
    | { ok: true }
    | { ok: false; attente_ms: number; restants: number };

/** Délai imposé après `essais` erreurs (0 tant qu'il reste des essais libres). */
export function attenteApres(essais: number): number {
    if (essais < ESSAIS_LIBRES) {
        return 0;
    }

    return Math.min(
        ATTENTE_INITIALE_MS * 2 ** (essais - ESSAIS_LIBRES),
        ATTENTE_MAX_MS,
    );
}

export async function verifierCode(
    base: Pick<BaseHorsLigne, 'profils'>,
    id: number,
    code: string,
    maintenant: number = Date.now(),
): Promise<VerdictCode> {
    const profil = await profilLocal(base, id);

    if (!profil?.code) {
        return { ok: false, attente_ms: 0, restants: 0 };
    }

    if (profil.bloque_jusqu !== null && profil.bloque_jusqu > maintenant) {
        return {
            ok: false,
            attente_ms: profil.bloque_jusqu - maintenant,
            restants: 0,
        };
    }

    const empreinte = await empreinteDe(
        code,
        profil.code.sel,
        profil.code.iterations,
    );

    if (codeValide(code) && empreinte === profil.code.empreinte) {
        await base.profils.update(id, { essais: 0, bloque_jusqu: null });

        return { ok: true };
    }

    const essais = profil.essais + 1;
    const attente = attenteApres(essais);
    await base.profils.update(id, {
        essais,
        bloque_jusqu: attente > 0 ? maintenant + attente : null,
    });

    return {
        ok: false,
        attente_ms: attente,
        restants: Math.max(0, ESSAIS_LIBRES - essais),
    };
}

/**
 * Le profil quitte le téléphone. Ses gestes encore en file y restent (ils
 * partiront à sa prochaine connexion ici) ; sans geste en attente, ses
 * données locales sont effacées. Les packs restent.
 */
export async function oublierProfil(base: Base, id: number): Promise<void> {
    await base.transaction(
        'rw',
        [
            base.profils,
            base.operations,
            base.anomalies,
            base.acquittees,
            base.progression,
            base.seances,
            base.examens_blancs,
            base.brouillons,
            base.contenus,
        ],
        async () => {
            await base.profils.delete(id);

            if (
                (await base.operations.where('auteur_id').equals(id).count()) >
                0
            ) {
                return;
            }

            const seances = (await base.seances
                .where('auteur_id')
                .equals(id)
                .primaryKeys()) as string[];
            await base.contenus.bulkDelete(
                seances.map((uuid) => `seance:${uuid}`),
            );
            await base.seances.where('auteur_id').equals(id).delete();
            await base.anomalies.where('auteur_id').equals(id).delete();
            await base.acquittees.where('auteur_id').equals(id).delete();
            await base.progression.delete(id);
            await base.examens_blancs.where('auteur_id').equals(id).delete();
            await base.brouillons.where('auteur_id').equals(id).delete();
        },
    );
}
