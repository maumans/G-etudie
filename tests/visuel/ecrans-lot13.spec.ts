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
 * Écrans du lot 13 (console plateforme), sur la cohorte fictive de
 * DemoPlateformeSeeder (bandeau « EXEMPLE ») et le compte 08 Sékou
 * (administrateur plateforme) : vue d'ensemble, activité, contenu,
 * revenus, impact, journal des accès, personnel. Le téléchargement du
 * rapport (le critère) se joue dans parcours-lot13.spec.ts, après les
 * captures : il écrit au journal.
 *
 * Le serveur est figé à l'instant du semis (cookie `horloge_demo`), le
 * navigateur sur HORLOGE : les semaines et les compteurs du jour restent
 * ceux de la démonstration. Rien n'est écrit (désactiver un compte : Pest).
 */

const ATTENTE = { timeout: 30_000 };

/** Un vendredi midi à Conakry (UTC+0), le jour du semis. */
const HORLOGE = new Date('2026-11-20T12:45:00Z');

type Ecran = { ecran: string; ouvrir: (page: Page) => Promise<void> };

const titre = (page: Page, nom: RegExp) =>
    expect(page.getByRole('heading', { level: 1, name: nom })).toBeVisible(
        ATTENTE,
    );

const ECRANS: Ecran[] = [
    {
        ecran: 'console-accueil',
        ouvrir: async (page) => {
            await page.goto('/console');
            await titre(page, /cette semaine/);
            await expect(
                page.getByText(/Impact sur 12 semaines/),
            ).toBeVisible();
        },
    },
    {
        ecran: 'console-activite',
        ouvrir: async (page) => {
            await page.goto('/console/activite');
            await titre(page, /travaille/);
        },
    },
    {
        ecran: 'console-contenu',
        ouvrir: async (page) => {
            await page.goto('/console/contenu');
            await titre(page, /contenu/);
        },
    },
    {
        ecran: 'console-revenus',
        ouvrir: async (page) => {
            await page.goto('/console/revenus');
            await titre(page, /revenus/);
        },
    },
    {
        ecran: 'console-impact',
        ouvrir: async (page) => {
            await page.goto('/console/impact');
            await titre(page, /impact/);
            await expect(
                page.getByRole('link', { name: /Télécharger le rapport/ }),
            ).toBeVisible();
        },
    },
    {
        ecran: 'console-journal',
        ouvrir: async (page) => {
            // Filtré sur une action semée : chaque passage ajoute des
            // connexions et un export au journal (compteurs masqués).
            await page.goto('/console/journal?action=code.utilise');
            await titre(page, /journal/);
        },
    },
    {
        ecran: 'console-personnel',
        ouvrir: async (page) => {
            await page.goto('/console/personnel');
            await titre(page, /personnel/);
        },
    },
];

for (const gabarit of GABARITS.filter((g) => g.nom !== '412')) {
    for (const theme of THEMES) {
        test.describe(`lot 13 · ${gabarit.nom} × ${theme.nom}`, () => {
            test.use({
                viewport: { width: gabarit.largeur, height: gabarit.hauteur },
                colorScheme: theme.schema,
                storageState: SESSIONS.console,
            });

            test.beforeEach(async ({ page }) => {
                await figerHorloges(page, HORLOGE);
            });

            for (const ecran of ECRANS) {
                test(`lot 13 — ${ecran.ecran}`, async ({ page }) => {
                    await ecran.ouvrir(page);
                    await page.waitForTimeout(300);
                    await capturer(
                        page,
                        'lot13',
                        ecran.ecran,
                        gabarit.nom,
                        theme.nom,
                        { figerVariables: true },
                    );
                });
            }
        });
    }
}
