import Dexie from 'dexie';
import type { Table } from 'dexie';

/**
 * Base locale `nkaramogo` (HORS_LIGNE.md A.3.4). Toutes les tables sont
 * déclarées dès le lot 0 ; chaque lot remplit les siennes (packs au lot 7,
 * examens blancs au lot 5…). Packs et contenus sont partagés entre les
 * profils du téléphone : la fratrie paie une fois en données.
 */

export type StatutOperation = 'en_attente' | 'envoi' | 'reporte';

/** Un geste élève en attente d'envoi (A.3.5). */
export type Operation = {
    /** UUID v7 : clé d'idempotence, et ordre des gestes. */
    uuid: string;
    type: string;
    charge: Record<string, unknown>;
    /** L'élève qui a fait le geste (profil actif). */
    auteur_id: number;
    /** ISO 8601, horloge de l'appareil. */
    saisi_le: string;
    /** 0 = la plus haute. */
    priorite: number;
    depend_de: string | null;
    essais: number;
    statut: StatutOperation;
    derniere_erreur: string | null;
};

/** Un geste refusé par le serveur, ou en échec technique répété. */
export type Anomalie = Operation & {
    genre: 'rejetee' | 'erreur';
    motif: string;
    survenue_le: string;
};

/** Un geste accepté, gardé 7 jours pour l'affichage et le débogage. */
export type Acquittee = {
    uuid: string;
    type: string;
    auteur_id: number;
    resultat: Record<string, unknown> | null;
    acquittee_le: string;
};

export type EntreeMeta = { cle: string; valeur: unknown };

type Ligne = Record<string, unknown>;

export class BaseHorsLigne extends Dexie {
    operations!: Table<Operation, string>;
    anomalies!: Table<Anomalie, string>;
    acquittees!: Table<Acquittee, string>;
    packs!: Table<Ligne, string>;
    contenus!: Table<Ligne, string>;
    progression!: Table<Ligne, number>;
    seances!: Table<Ligne, string>;
    examens_blancs!: Table<Ligne, string>;
    profils!: Table<Ligne, number>;
    brouillons!: Table<Ligne, string>;
    meta!: Table<EntreeMeta, string>;

    constructor(nom = 'nkaramogo') {
        super(nom);

        this.version(1).stores({
            operations: 'uuid, [priorite+uuid], auteur_id, statut',
            anomalies: 'uuid, auteur_id',
            acquittees: 'uuid, auteur_id, acquittee_le',
            packs: 'cle',
            contenus: 'cle, pack',
            progression: 'auteur_id',
            seances: 'id, auteur_id',
            examens_blancs: 'id, auteur_id',
            profils: 'id',
            brouillons: 'cle, auteur_id',
            meta: 'cle',
        });
    }

    async lireMeta<T>(cle: string): Promise<T | undefined> {
        return (await this.meta.get(cle))?.valeur as T | undefined;
    }

    async ecrireMeta(cle: string, valeur: unknown): Promise<void> {
        await this.meta.put({ cle, valeur });
    }
}
