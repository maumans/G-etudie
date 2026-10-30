import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initialiserGardeNavigation } from '@/lib/hors-ligne/garde-navigation';
import type {
    MotifIndisponible,
    RouteurGarde,
} from '@/lib/hors-ligne/garde-navigation';

/** n° 18 : visite annulée, préchargement tu, message selon l'échec. */

type Rappel = Parameters<RouteurGarde['on']>[1];

function fauxRouteur() {
    const rappels: Record<string, Rappel[]> = {};

    const routeur: RouteurGarde = {
        on(evenement, rappel) {
            (rappels[evenement] ??= []).push(rappel);

            return () => {};
        },
    };

    const emettre = (evenement: string, visite?: Record<string, unknown>) => {
        let annule = false;
        const resultats = (rappels[evenement] ?? []).map((rappel) =>
            rappel({
                detail: { visit: visite as never },
                preventDefault: () => {
                    annule = true;
                },
            }),
        );

        return { annule: annule || resultats.includes(false) };
    };

    return { routeur, emettre };
}

const visite = (chemin: string, options: Record<string, unknown> = {}) => ({
    url: new URL(chemin, window.location.origin),
    method: 'get',
    prefetch: false,
    only: [],
    except: [],
    async: false,
    ...options,
});

describe('garde de navigation', () => {
    let horsLigne: boolean;
    let ouverts: MotifIndisponible[];
    const signalerHorsLigne = vi.fn();
    let emettre: ReturnType<typeof fauxRouteur>['emettre'];

    beforeEach(() => {
        horsLigne = true;
        ouverts = [];
        signalerHorsLigne.mockReset();
        const faux = fauxRouteur();
        emettre = faux.emettre;
        initialiserGardeNavigation(faux.routeur, {
            horsLigne: () => horsLigne,
            pages: () => ['/eleve$', '/lecons'],
            ouvrir: (motif) => ouverts.push(motif),
            signalerHorsLigne,
        });
    });

    it('en ligne, ne touche à rien', () => {
        horsLigne = false;

        expect(emettre('before', visite('/contenu')).annule).toBe(false);
        expect(ouverts).toEqual([]);
    });

    it('hors ligne, laisse passer un écran gardé', () => {
        expect(emettre('before', visite('/lecons/12')).annule).toBe(false);
        expect(ouverts).toEqual([]);
    });

    it('hors ligne, annule une visite vers un écran indisponible et explique', () => {
        expect(emettre('before', visite('/eleve/progression')).annule).toBe(
            true,
        );
        expect(ouverts).toEqual(['connexion_requise']);
    });

    it('hors ligne, annule un préchargement en silence', () => {
        expect(
            emettre('before', visite('/contenu', { prefetch: true })).annule,
        ).toBe(true);
        expect(ouverts).toEqual([]);
    });

    it('hors ligne, refuse une écriture : « rien n’a été enregistré »', () => {
        expect(
            emettre('before', visite('/eleve', { method: 'post' })).annule,
        ).toBe(true);
        expect(ouverts).toEqual(['ecriture']);
    });

    it('erreur réseau sur une visite partie : hors ligne aussitôt, et le bon message', () => {
        horsLigne = false;
        emettre('start', visite('/lecons/3'));

        expect(emettre('networkError').annule).toBe(true);
        expect(signalerHorsLigne).toHaveBeenCalledOnce();
        expect(ouverts).toEqual(['pas_encore_ouvert']);

        emettre('start', visite('/compte/profil', { method: 'patch' }));
        emettre('networkError');
        emettre('start', visite('/contenu'));
        emettre('networkError');
        expect(ouverts).toEqual([
            'pas_encore_ouvert',
            'ecriture',
            'connexion_requise',
        ]);
    });

    it('un rechargement partiel ou un préchargement qui échoue reste silencieux', () => {
        horsLigne = false;
        emettre('start', visite('/eleve', { only: ['tableau'] }));
        emettre('networkError');
        emettre('start', visite('/lecons', { prefetch: true }));
        emettre('networkError');

        expect(ouverts).toEqual([]);
        expect(signalerHorsLigne).toHaveBeenCalledTimes(2);
    });
});
