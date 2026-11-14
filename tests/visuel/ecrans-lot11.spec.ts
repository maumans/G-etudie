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
 * Écrans du lot 11 (parents, enseignants, établissements, devoirs), sur les
 * données d'exemple de DemoOrganisationSeeder (bandeau « EXEMPLE ») :
 *
 * - parent (02 Mamadou) : ses enfants, la semaine d'Aïssatou, payer son
 *   abonnement ;
 * - enseignante (03 Fatoumata) : ses groupes, la 10e A (notions faibles,
 *   critère du lot), un nouveau devoir, le suivi d'un devoir rendu ;
 * - gestionnaire (07 Mariama) : le rapport de préparation, un groupe, les
 *   licences ;
 * - élève (01 Aïssatou) : « Mes groupes », « Mon compte › Parents » ;
 * - console (08) : les établissements, une fiche.
 */

const ATTENTE = { timeout: 30_000 };

/** Un jeudi soir à Conakry (UTC+0). */
const HORLOGE = new Date('2026-11-12T19:00:00Z');

type Ecran = {
    ecran: string;
    session: keyof typeof SESSIONS;
    ouvrir: (page: Page) => Promise<void>;
};

const titre = (page: Page, nom: RegExp) =>
    expect(page.getByRole('heading', { level: 1, name: nom })).toBeVisible(
        ATTENTE,
    );

const ouvrirGroupe = async (page: Page) => {
    await page.goto('/enseignant');
    await titre(page, /Bonjour/);
    await page.getByRole('link', { name: /10e A/ }).first().click();
    await titre(page, /Groupe 10e A/);
};

const ECRANS: Ecran[] = [
    {
        ecran: 'parent-accueil',
        session: 'parent',
        ouvrir: async (page) => {
            await page.goto('/parent');
            await titre(page, /Bonjour/);
            await expect(page.getByText('Aïssatou').first()).toBeVisible();
        },
    },
    {
        ecran: 'parent-enfant',
        session: 'parent',
        ouvrir: async (page) => {
            await page.goto('/parent');
            await page
                .getByRole('link', { name: /Aïssatou/ })
                .first()
                .click();
            await titre(page, /La semaine de Aïssatou/);
        },
    },
    {
        ecran: 'parent-abonnement',
        session: 'parent',
        ouvrir: async (page) => {
            await page.goto('/parent');
            await page
                .getByRole('link', { name: /Aïssatou/ })
                .first()
                .click();
            await page.getByRole('link', { name: /abonnement/ }).click();
            await titre(page, /L’abonnement de Aïssatou/);
        },
    },
    {
        ecran: 'enseignant-accueil',
        session: 'enseignant',
        ouvrir: async (page) => {
            await page.goto('/enseignant');
            await titre(page, /Bonjour/);
        },
    },
    {
        ecran: 'enseignant-groupe',
        session: 'enseignant',
        ouvrir: async (page) => {
            await ouvrirGroupe(page);
            await expect(
                page.getByText('Notions à retravailler en classe'),
            ).toBeVisible();
        },
    },
    {
        ecran: 'enseignant-devoir-nouveau',
        session: 'enseignant',
        ouvrir: async (page) => {
            await ouvrirGroupe(page);
            await page.getByRole('link', { name: 'Donner un devoir' }).click();
            await titre(page, /Un devoir/);
            // Deux questions choisies : l'ordre apparaît à côté.
            const questions = page
                .getByRole('list', { name: 'Questions publiées' })
                .getByRole('button');
            await questions.nth(1).click();
            await questions.nth(0).click();
        },
    },
    {
        ecran: 'enseignant-devoir',
        session: 'enseignant',
        ouvrir: async (page) => {
            await ouvrirGroupe(page);
            await page
                .getByRole('link', { name: /Le théorème de Pythagore/ })
                .click();
            await titre(page, /Le théorème de Pythagore/);
        },
    },
    {
        ecran: 'etablissement-accueil',
        session: 'etablissement',
        ouvrir: async (page) => {
            await page.goto('/etablissement');
            await titre(page, /Collège exemple de Ratoma/);
        },
    },
    {
        ecran: 'etablissement-groupe',
        session: 'etablissement',
        ouvrir: async (page) => {
            await page.goto('/etablissement');
            await page.getByRole('link', { name: /10e A/ }).first().click();
            await titre(page, /Groupe 10e A/);
        },
    },
    {
        ecran: 'etablissement-licences',
        session: 'etablissement',
        ouvrir: async (page) => {
            await page.goto('/etablissement/licences');
            await titre(page, /licences/);
        },
    },
    {
        ecran: 'eleve-groupes',
        session: 'eleve',
        ouvrir: async (page) => {
            await page.goto('/eleve/groupes');
            await titre(page, /devoir|Tes devoirs/);
        },
    },
    {
        ecran: 'compte-parents',
        session: 'eleve',
        ouvrir: async (page) => {
            await page.goto('/compte/parents');
            await expect(page.getByText('Qui me suit')).toBeVisible(ATTENTE);
        },
    },
    {
        ecran: 'console-etablissements',
        session: 'console',
        ouvrir: async (page) => {
            await page.goto('/console/etablissements');
            await titre(page, /établissements/);
        },
    },
    {
        ecran: 'console-etablissement',
        session: 'console',
        ouvrir: async (page) => {
            await page.goto('/console/etablissements');
            await page
                .getByRole('link', { name: /Collège exemple de Ratoma/ })
                .click();
            await titre(page, /Collège exemple de Ratoma/);
        },
    },
];

for (const gabarit of GABARITS.filter((g) => g.nom !== '412')) {
    for (const theme of THEMES) {
        test.describe(`lot 11 · ${gabarit.nom} × ${theme.nom}`, () => {
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

                    test(`lot 11 — ${ecran.ecran}`, async ({ page }) => {
                        await ecran.ouvrir(page);
                        await page.waitForTimeout(300);
                        await capturer(
                            page,
                            'lot11',
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
