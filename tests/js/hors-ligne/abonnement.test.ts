import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { examensLocauxDuMois, examensRestants, moisDe } from '@/lib/abonnement';
import type { DroitsAppareil } from '@/lib/abonnement';
import { BaseHorsLigne } from '@/lib/hors-ligne/base';

/**
 * Lot 9 : deux examens blancs par mois sans abonnement, tranché aussi hors
 * ligne. Le serveur donne ceux qu'il a reçus ; l'appareil ajoute ceux qu'il
 * garde (en cours, ou terminés en attente d'envoi).
 */

const NOM = 'nkaramogo-abonnement-test';
let base: BaseHorsLigne;

afterEach(async () => {
    base?.close();
    await indexedDB.deleteDatabase(NOM);
});

const droits = (
    faits: number,
    mois = '2026-11',
    limite: number | null = 2,
): DroitsAppareil => ({
    abonne: limite === null,
    fin: null,
    examens_blancs: { limite, faits, mois },
});

describe('examensRestants', () => {
    const maintenant = new Date('2026-11-20T10:00:00');

    it('retire du quota ce que le serveur a reçu et ce que garde l’appareil', () => {
        expect(examensRestants(droits(0), 0, maintenant)).toBe(2);
        expect(examensRestants(droits(1), 0, maintenant)).toBe(1);
        expect(examensRestants(droits(1), 1, maintenant)).toBe(0);
        expect(examensRestants(droits(2), 3, maintenant)).toBe(0);
    });

    it('un décompte d’un autre mois (copie ancienne) ne compte plus', () => {
        expect(examensRestants(droits(2, '2026-10'), 0, maintenant)).toBe(2);
    });

    it('abonné : sans limite', () => {
        expect(
            examensRestants(droits(5, '2026-11', null), 4, maintenant),
        ).toBeNull();
    });
});

describe('examensLocauxDuMois', () => {
    it('compte les examens en cours et ceux qui attendent d’être envoyés, de ce mois et de cet élève', async () => {
        base = new BaseHorsLigne(NOM);
        const maintenant = new Date('2026-11-20T10:00:00');

        await base.examens_blancs.bulkPut([
            { id: 'e1', auteur_id: 7, commence_le: '2026-11-19T08:00:00.000Z' },
            { id: 'e2', auteur_id: 8, commence_le: '2026-11-19T08:00:00.000Z' },
        ]);
        await base.operations.bulkPut(
            [
                {
                    uuid: 'o1',
                    type: 'examen_blanc.terminer',
                    commence_le: '2026-11-02T08:00:00.000Z',
                    auteur: 7,
                },
                {
                    uuid: 'o2',
                    type: 'examen_blanc.terminer',
                    commence_le: '2026-10-30T08:00:00.000Z',
                    auteur: 7,
                },
                {
                    uuid: 'o3',
                    type: 'tentative.enregistrer',
                    commence_le: '2026-11-02T08:00:00.000Z',
                    auteur: 7,
                },
            ].map((o) => ({
                uuid: o.uuid,
                type: o.type,
                charge: { commence_le: o.commence_le },
                auteur_id: o.auteur,
                saisi_le: o.commence_le,
                priorite: 0,
                depend_de: null,
                essais: 0,
                statut: 'en_attente' as const,
                derniere_erreur: null,
            })),
        );

        expect(await examensLocauxDuMois(base, 7, maintenant)).toBe(2);
        expect(await examensLocauxDuMois(base, 8, maintenant)).toBe(1);
        expect(moisDe(maintenant)).toBe('2026-11');
    });
});
