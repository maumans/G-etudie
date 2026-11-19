import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import {
    GABARITS,
    SESSIONS,
    THEMES,
    capturer,
    figerHorloges,
} from './gabarits';

/**
 * Écrans du lot 12 (culture générale, ressources externes, communauté
 * encadrée), sur les données d'exemple de DemoCommunauteSeeder (bandeau
 * « EXEMPLE ») :
 *
 * - élève (01 Aïssatou) : « Culture générale » (question du jour, thèmes,
 *   défi entre amis), la leçon de Pythagore et ses ressources, le dialogue
 *   « Tu quittes N'karamögö », le fil de la 10e A ;
 * - enseignante (03 Fatoumata) : le fil (un message signalé en tête), le
 *   classement du « Défi du vendredi » ;
 * - back-office : les ressources (rédacteur), la modération (responsable
 *   pédagogique).
 *
 * Rien n'est écrit : le quiz et le signalement se jouent dans
 * parcours-lot12.spec.ts.
 */

const ATTENTE = { timeout: 30_000 };

/** Un jeudi soir à Conakry (UTC+0). */
const HORLOGE = new Date('2026-11-19T19:00:00Z');

type Ecran = {
    ecran: string;
    session: keyof typeof SESSIONS;
    ouvrir: (page: Page) => Promise<void>;
};

const titre = (page: Page, nom: RegExp) =>
    expect(page.getByRole('heading', { level: 1, name: nom })).toBeVisible(
        ATTENTE,
    );

const ouvrirLecon = async (page: Page) => {
    await page.goto('/eleve/cours/maths');
    await page
        .getByRole('link', { name: /Le théorème de Pythagore/ })
        .first()
        .click();
    await titre(page, /Pythagore/);
};

const ECRANS: Ecran[] = [
    {
        ecran: 'eleve-culture',
        session: 'eleve',
        ouvrir: async (page) => {
            await page.goto('/eleve/culture');
            await titre(page, /le monde/);
            await expect(page.getByText('La question du jour')).toBeVisible();
        },
    },
    {
        ecran: 'eleve-lecon-ressources',
        session: 'eleve',
        ouvrir: async (page) => {
            await ouvrirLecon(page);
            await expect(
                page.getByText('Sur d’autres sites, vérifiés par l’équipe'),
            ).toBeVisible();
        },
    },
    {
        ecran: 'eleve-sortie',
        session: 'eleve',
        ouvrir: async (page) => {
            await ouvrirLecon(page);
            await page
                .getByRole('button', {
                    name: /Théorème de Pythagore.*Wikipédia/,
                })
                .click();
            await expect(
                page.getByRole('dialog', { name: 'Tu quittes N’karamögö' }),
            ).toBeVisible();
        },
    },
    {
        ecran: 'eleve-fil',
        session: 'eleve',
        ouvrir: async (page) => {
            await page.goto('/eleve/groupes');
            await page
                .getByRole('link', { name: /Questions du groupe 10e A/ })
                .click();
            await titre(page, /du groupe/);
            await expect(
                page.getByText(/comment je sais quel côté est l’hypoténuse/),
            ).toBeVisible();
        },
    },
    {
        ecran: 'enseignant-fil',
        session: 'enseignant',
        ouvrir: async (page) => {
            await page.goto('/enseignant');
            await page.getByRole('link', { name: /10e A/ }).first().click();
            await page
                .getByRole('link', { name: /Questions de la classe/ })
                .click();
            await titre(page, /de la classe/);
            await expect(
                page.getByRole('heading', { name: /message signalé/ }),
            ).toBeVisible();
        },
    },
    {
        ecran: 'enseignant-defi',
        session: 'enseignant',
        ouvrir: async (page) => {
            await page.goto('/enseignant');
            await page.getByRole('link', { name: /10e A/ }).first().click();
            await page.getByRole('link', { name: /Défi du vendredi/ }).click();
            await titre(page, /Défi du vendredi/);
            await expect(page.getByText('Classement du défi')).toBeVisible();
        },
    },
    {
        ecran: 'contenu-ressources',
        session: 'contenu',
        ouvrir: async (page) => {
            await page.goto('/contenu/ressources?etat=verifiees');
            await titre(page, /ressources/);
        },
    },
    {
        ecran: 'contenu-moderation',
        session: 'pedagogie',
        ouvrir: async (page) => {
            await page.goto('/contenu/moderation');
            await titre(page, /modération/);
        },
    },
];

for (const gabarit of GABARITS.filter((g) => g.nom !== '412')) {
    for (const theme of THEMES) {
        test.describe(`lot 12 · ${gabarit.nom} × ${theme.nom}`, () => {
            test.use({
                viewport: { width: gabarit.largeur, height: gabarit.hauteur },
                colorScheme: theme.schema,
            });

            test.beforeEach(async ({ page }) => {
                await figerHorloges(page, HORLOGE);
            });

            for (const ecran of ECRANS) {
                test.describe(ecran.ecran, () => {
                    test.use({ storageState: SESSIONS[ecran.session] });

                    test(`lot 12 — ${ecran.ecran}`, async ({ page }) => {
                        await ecran.ouvrir(page);
                        await page.waitForTimeout(300);
                        await capturer(
                            page,
                            'lot12',
                            ecran.ecran,
                            gabarit.nom,
                            theme.nom,
                            { figerVariables: true },
                        );
                    });
                });
            }
        });
    }
}
