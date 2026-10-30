import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    afficherSecours,
    chargerPage,
    CLE_RECHARGEMENT,
    deciderApresEchec,
} from '@/lib/chargement-page';
import type { Environnement } from '@/lib/chargement-page';

// HORS_LIGNE.md A.14, test 19 : échec d'import → rechargement une fois en
// ligne, jamais hors ligne.
function environnement(
    enLigne: boolean,
    stockage: Record<string, string> = {},
) {
    const env = {
        enLigne: () => enLigne,
        lire: (cle: string) => stockage[cle] ?? null,
        ecrire: vi.fn((cle: string, valeur: string) => {
            stockage[cle] = valeur;
        }),
        effacer: vi.fn((cle: string) => {
            delete stockage[cle];
        }),
        recharger: vi.fn(),
        auRetourDuReseau: vi.fn(),
        afficherSecours: vi.fn(),
    } satisfies Environnement;

    return { env, stockage };
}

const echoue = () =>
    Promise.reject(
        new TypeError('Failed to fetch dynamically imported module'),
    );
const reussit = () => Promise.resolve({ default: 'Page' });

/** La promesse d'une page en échec ne se résout jamais : on n'attend qu'un tour. */
const unTour = () => new Promise((resoudre) => setTimeout(resoudre, 0));

describe('deciderApresEchec', () => {
    it('recharge une fois en ligne, jamais hors ligne', () => {
        expect(deciderApresEchec({ enLigne: true, dejaRecharge: false })).toBe(
            'recharger',
        );
        expect(deciderApresEchec({ enLigne: true, dejaRecharge: true })).toBe(
            'dernier_recours',
        );
        expect(deciderApresEchec({ enLigne: false, dejaRecharge: false })).toBe(
            'secours_hors_ligne',
        );
        expect(deciderApresEchec({ enLigne: false, dejaRecharge: true })).toBe(
            'secours_hors_ligne',
        );
    });
});

describe('chargerPage', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('rend le composant par défaut de la page et oublie un rechargement passé', async () => {
        const { env, stockage } = environnement(true, {
            [CLE_RECHARGEMENT]: '1',
        });

        await expect(
            chargerPage(
                'dev/composants',
                { './pages/dev/composants.tsx': reussit },
                env,
            ),
        ).resolves.toBe('Page');
        expect(stockage[CLE_RECHARGEMENT]).toBeUndefined();
    });

    it("lève une erreur claire pour une page qui n'existe pas", async () => {
        const { env } = environnement(true);

        await expect(chargerPage('inconnue', {}, env)).rejects.toThrow(
            'Page introuvable : inconnue',
        );
    });

    it('en ligne, recharge la page une fois et le note', async () => {
        const { env, stockage } = environnement(true);

        void chargerPage('lecon', { './pages/lecon.tsx': echoue }, env);
        await unTour();

        expect(env.recharger).toHaveBeenCalledTimes(1);
        expect(stockage[CLE_RECHARGEMENT]).toBeDefined();
        expect(env.afficherSecours).not.toHaveBeenCalled();
    });

    it('en ligne, après un rechargement déjà tenté, affiche le dernier recours sans recharger', async () => {
        const { env } = environnement(true, { [CLE_RECHARGEMENT]: '1' });

        void chargerPage('lecon', { './pages/lecon.tsx': echoue }, env);
        await unTour();

        expect(env.recharger).not.toHaveBeenCalled();
        expect(env.afficherSecours).toHaveBeenCalledWith('dernier_recours');
    });

    it('hors ligne, ne recharge pas : écran de secours, rechargement au retour du réseau', async () => {
        const { env } = environnement(false);

        void chargerPage('lecon', { './pages/lecon.tsx': echoue }, env);
        await unTour();

        expect(env.recharger).not.toHaveBeenCalled();
        expect(env.afficherSecours).toHaveBeenCalledWith('hors_ligne');
        expect(env.auRetourDuReseau).toHaveBeenCalledTimes(1);

        env.auRetourDuReseau.mock.calls[0][0]();
        expect(env.recharger).toHaveBeenCalledTimes(1);
    });
});

describe('afficherSecours', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('dit que les réponses sont gardées et propose de recharger, sans dépendre du CSS', () => {
        afficherSecours('hors_ligne');

        const ecran = document.getElementById('ecran-secours');
        expect(ecran?.getAttribute('role')).toBe('alert');
        expect(ecran?.textContent).toContain(
            'Tes réponses déjà faites sont gardées',
        );
        expect(ecran?.style.position).toBe('fixed');
        expect(ecran?.querySelector('button')?.textContent).toBe('Recharger');
    });

    it("n'empile pas deux écrans", () => {
        afficherSecours('hors_ligne');
        afficherSecours('dernier_recours');

        expect(document.querySelectorAll('#ecran-secours')).toHaveLength(1);
        expect(document.getElementById('ecran-secours')?.textContent).toContain(
            "n'a pas pu se charger",
        );
    });
});
