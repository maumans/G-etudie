import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { lirePageLocale } from '@/lib/contenu/source';
import { BaseHorsLigne } from '@/lib/hors-ligne/base';
import type { Operation } from '@/lib/hors-ligne/base';
import {
    jaugeLaPlusRecente,
    jourLocal,
    joursDesReponses,
    lireProgressionLocale,
    marquerSeanceTerminee,
    prochaineSeanceLocale,
    rangerInstantane,
    reponsesNonComptees,
    traceAvecLocal,
} from '@/lib/progression/locale';
import type { Instantane, Serie } from '@/lib/progression/locale';

/*
 * HL4 (HORS_LIGNE.md A.10) : la jauge du serveur gardée sur le téléphone,
 * les réponses pas encore comptées, les trois séances préparées faites hors
 * ligne, la trace complétée des réponses de ce téléphone. Aucun calcul de
 * maîtrise ni choix de questions ici.
 */

const NOM = 'nkaramogo-progression-test';
let base: BaseHorsLigne;

afterEach(async () => {
    await base?.delete();
});

const UUID = (n: number) => `0190f0a0-0000-7000-8000-00000000000${n}`;

function serie(etats: Serie['cases'][number]['etat'][], jours = 2): Serie {
    return {
        jours,
        rompue: false,
        aujourdhui_fait: false,
        reponses_semaine: 4,
        cases: etats.map((etat, rang) => ({
            date: `2026-11-${String(2 + rang).padStart(2, '0')}`,
            jour: ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'][rang % 7],
            etat,
        })),
        calcule_le: '2026-11-05T08:00:00.000Z',
    };
}

function instantane(uuids: string[], pourcentage = 40): Instantane {
    return {
        calcule_le: '2026-11-05T08:00:00.000Z',
        jauge: {
            pourcentage,
            matieres: [{ cle: 'maths', maitrise: pourcentage }],
            calcule_le: '2026-11-05T08:00:00.000Z',
        },
        serie: serie(['commence', 'objectif', 'aujourdhui']),
        seances: uuids.map((uuid, rang) => ({
            uuid,
            rang: rang + 1,
            props: {
                seance: { uuid, duree_minutes: 15, terminee: false },
                questions: [],
                reponses: [],
            },
        })),
    };
}

function operation(champs: Partial<Operation>): Operation {
    return {
        uuid: UUID(9),
        type: 'tentative.enregistrer',
        charge: {},
        auteur_id: 1,
        saisi_le: '2026-11-04T20:00:00.000Z',
        priorite: 1,
        depend_de: null,
        essais: 0,
        statut: 'en_attente',
        derniere_erreur: null,
        ...champs,
    };
}

describe('jauge hors ligne (HL-D7)', () => {
    it('garde la plus récente des deux jauges du serveur', () => {
        const page = {
            pourcentage: 30,
            matieres: [],
            calcule_le: '2026-11-05T08:00:00Z',
        };
        const gardee = {
            pourcentage: 42,
            matieres: [],
            calcule_le: '2026-11-05T09:00:00Z',
        };

        expect(jaugeLaPlusRecente(page, gardee).pourcentage).toBe(42);
        expect(
            jaugeLaPlusRecente(
                { ...page, calcule_le: '2026-11-05T10:00:00Z' },
                gardee,
            ).pourcentage,
        ).toBe(30);
        expect(jaugeLaPlusRecente(page, null)).toBe(page);
    });

    it('compte les réponses de ce profil encore dans la file, pas les autres gestes', () => {
        const file = [
            operation({ uuid: UUID(1) }),
            operation({ uuid: UUID(2) }),
            operation({ uuid: UUID(3), type: 'seance.terminer' }),
            operation({ uuid: UUID(4), auteur_id: 2 }),
        ];

        expect(reponsesNonComptees(file, 1)).toBe(2);
    });
});

describe("trace sur l'appareil", () => {
    it("un jour où l'élève a répondu ici compte tout de suite, à confirmer", () => {
        const trace = traceAvecLocal(
            serie(['commence', 'objectif', 'aujourdhui']),
            ['2026-11-04'],
            '2026-11-04',
        );

        expect(trace.cases.map((c) => c.etat)).toEqual([
            'commence',
            'objectif',
            'commence',
        ]);
        expect(trace.jours).toBe(3);
        expect(trace.aujourdhui_fait).toBe(true);
        expect(trace.provisoire).toBe(true);
    });

    it("sans réponse locale, la trace du serveur telle quelle ; l'objectif reste au serveur", () => {
        const serveur = serie(['commence', 'objectif', 'aujourdhui']);
        const trace = traceAvecLocal(serveur, ['2026-11-03'], '2026-11-04');

        expect(trace.cases).toEqual(serveur.cases);
        expect(trace.jours).toBe(2);
        expect(trace.provisoire).toBe(false);
    });

    it("les jours se lisent sur l'heure locale des gestes", () => {
        const jour = jourLocal(new Date('2026-11-04T20:00:00.000Z'));

        expect(
            joursDesReponses([operation({}), operation({ uuid: UUID(2) })], 1),
        ).toEqual([jour]);
    });
});

describe("séances préparées d'avance (A.10)", () => {
    it("rangées avec les props de leur écran : la séance s'ouvre sans réseau", async () => {
        base = new BaseHorsLigne(NOM);
        await rangerInstantane(
            base,
            1,
            instantane([UUID(1), UUID(2), UUID(3)]),
        );

        const page = await lirePageLocale(base, `/eleve/seances/${UUID(2)}`);

        expect(page?.component).toBe('eleve/seance');
        expect((page?.props.seance as { uuid: string } | undefined)?.uuid).toBe(
            UUID(2),
        );
        expect((await lireProgressionLocale(base, 1))?.jauge?.pourcentage).toBe(
            40,
        );
    });

    it("« Commencer » hors ligne prend la suivante pas encore terminée, dans l'ordre", async () => {
        base = new BaseHorsLigne(NOM);
        await rangerInstantane(
            base,
            1,
            instantane([UUID(1), UUID(2), UUID(3)]),
        );

        expect(await prochaineSeanceLocale(base, 1)).toBe(UUID(1));

        await marquerSeanceTerminee(base, UUID(1));
        expect(await prochaineSeanceLocale(base, 1)).toBe(UUID(2));

        // Un autre profil du téléphone n'a pas ces séances.
        expect(await prochaineSeanceLocale(base, 2)).toBeNull();
    });

    it("un nouvel instantané remplace les séances, sauf celle qu'une réponse en file cite encore", async () => {
        base = new BaseHorsLigne(NOM);
        await rangerInstantane(
            base,
            1,
            instantane([UUID(1), UUID(2), UUID(3)]),
        );
        await marquerSeanceTerminee(base, UUID(1));
        await base.operations.add(operation({ charge: { seance: UUID(2) } }));

        await rangerInstantane(
            base,
            1,
            instantane([UUID(4), UUID(5), UUID(6)], 55),
        );

        const gardees = (await base.seances.toArray())
            .map((s) => String(s.id))
            .sort((a, b) => a.localeCompare(b));
        expect(gardees).toEqual([UUID(2), UUID(4), UUID(5), UUID(6)]);
        expect(
            await lirePageLocale(base, `/eleve/seances/${UUID(3)}`),
        ).toBeNull();
        expect(
            await lirePageLocale(base, `/eleve/seances/${UUID(2)}`),
        ).not.toBeNull();
        expect((await lireProgressionLocale(base, 1))?.jauge?.pourcentage).toBe(
            55,
        );
    });

    it('une séance gardée et toujours proposée garde son état « terminée »', async () => {
        base = new BaseHorsLigne(NOM);
        await rangerInstantane(base, 1, instantane([UUID(1), UUID(2)]));
        await marquerSeanceTerminee(base, UUID(1));
        await rangerInstantane(base, 1, instantane([UUID(1), UUID(2)]));

        expect(await prochaineSeanceLocale(base, 1)).toBe(UUID(2));
    });
});
