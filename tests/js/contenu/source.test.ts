import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleContenu, lirePageLocale, pageLocaleDe } from '@/lib/contenu/source';
import { BaseHorsLigne } from '@/lib/hors-ligne/base';
import { initialiserGardeNavigation } from '@/lib/hors-ligne/garde-navigation';
import type {
    MotifIndisponible,
    RouteurGarde,
} from '@/lib/hors-ligne/garde-navigation';

/*
 * HL1 (HORS_LIGNE.md A.4) : un écran de leçon s'affiche depuis la base
 * locale quand l'élément y est (pack, lot 7), avec les props mêmes du
 * serveur ; sinon, le dialogue « pas encore ouvert ici ».
 */

const UUID = '01a18f5a-009c-706e-8f15-c520b81a2e6f';
const PROPS = {
    lecon: {
        type: 'lecon',
        uuid: UUID,
        version: 2,
        titre: 'Le cosinus',
        blocs: { type: 'doc', content: [] },
        minutes: 1,
        est_exemple: true,
    },
    contexte: { notion: 'Le cosinus' },
    progression: { etat: null, position: 0 },
};

let base: BaseHorsLigne;
let nom = 0;

beforeEach(() => {
    base = new BaseHorsLigne(`source-${++nom}`);
});

afterEach(async () => {
    await base.delete();
});

describe('source des contenus', () => {
    it("reconnaît les écrans qui savent s'afficher depuis un pack", () => {
        expect(pageLocaleDe(`/eleve/lecons/${UUID}`)).toEqual({
            component: 'eleve/lecon',
            cle: `lecon:${UUID}`,
        });
        expect(
            pageLocaleDe(`/eleve/lecons/${UUID.toUpperCase()}?x=1`)?.cle,
        ).toBe(cleContenu('lecon', UUID));
        expect(pageLocaleDe('/eleve/cours')).toBeNull();
        expect(pageLocaleDe('/eleve/lecons/12')).toBeNull();
    });

    it("lit les props d'un élément téléchargé, rien sinon", async () => {
        expect(await lirePageLocale(base, `/eleve/lecons/${UUID}`)).toBeNull();

        await base.contenus.put({
            cle: cleContenu('lecon', UUID),
            pack: 'maths-bepc',
            props: PROPS,
        });

        expect(await lirePageLocale(base, `/eleve/lecons/${UUID}`)).toEqual({
            component: 'eleve/lecon',
            cle: `lecon:${UUID}`,
            props: PROPS,
        });
    });
});

describe('garde de navigation et contenu local', () => {
    function brancher(afficherLocal: (url: URL) => Promise<boolean>) {
        const rappels: Record<string, Parameters<RouteurGarde['on']>[1][]> = {};
        const ouverts: MotifIndisponible[] = [];
        const routeur: RouteurGarde = {
            on(evenement, rappel) {
                (rappels[evenement] ??= []).push(rappel);

                return () => {};
            },
        };
        initialiserGardeNavigation(routeur, {
            horsLigne: () => true,
            pages: () => ['/eleve/lecons'],
            ouvrir: (motif) => ouverts.push(motif),
            signalerHorsLigne: () => {},
            afficherLocal,
        });

        const echouer = (chemin: string, method = 'get') => {
            const visit = {
                url: new URL(chemin, window.location.origin),
                method,
            };
            const evenement = { detail: { visit }, preventDefault: () => {} };
            rappels.start.forEach((rappel) => rappel(evenement as never));
            rappels.networkError.forEach((rappel) =>
                rappel(evenement as never),
            );
        };

        return { ouverts, echouer };
    }

    it("affiche la leçon depuis le pack au lieu d'ouvrir le dialogue", async () => {
        const afficher = vi.fn(async (_url: URL) => true);
        const { ouverts, echouer } = brancher(afficher);

        echouer(`/eleve/lecons/${UUID}`);
        await vi.waitFor(() => expect(afficher).toHaveBeenCalledOnce());

        expect(afficher.mock.calls[0]?.[0].pathname).toBe(
            `/eleve/lecons/${UUID}`,
        );
        expect(ouverts).toEqual([]);
    });

    it("sans élément local (ou si la lecture échoue), le dialogue s'ouvre", async () => {
        const absent = brancher(async () => false);
        absent.echouer(`/eleve/lecons/${UUID}`);
        await vi.waitFor(() =>
            expect(absent.ouverts).toEqual(['pas_encore_ouvert']),
        );

        const panne = brancher(async () => {
            throw new Error('base fermée');
        });
        panne.echouer(`/eleve/lecons/${UUID}`);
        await vi.waitFor(() =>
            expect(panne.ouverts).toEqual(['pas_encore_ouvert']),
        );
    });

    it('une écriture ne cherche jamais de contenu local', () => {
        const afficher = vi.fn(async (_url: URL) => true);
        const { ouverts, echouer } = brancher(afficher);

        echouer('/eleve/seance', 'post');

        expect(afficher).not.toHaveBeenCalled();
        expect(ouverts).toEqual(['ecriture']);
    });
});
