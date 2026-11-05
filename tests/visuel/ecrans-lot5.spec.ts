import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { GABARITS, SESSIONS, THEMES, capturer } from './gabarits';

/**
 * Écrans du lot 5 (examen blanc), sur les données de démonstration :
 * annales fictives de DemoAnnalesSeeder, deux examens blancs d'Aïssatou
 * (DemoExamensBlancsSeeder). Le passage vit sur l'appareil (Dexie) : chaque
 * test part d'un navigateur neuf ; la file est simulée.
 *
 * L'onglet fermé en plein examen puis repris : parcours-lot5.spec.ts.
 */

const ATTENTE = { timeout: 20_000 };

/** Un jeudi matin à Conakry (UTC+0). */
const HORLOGE = new Date('2026-11-05T10:00:00Z');

type Ecran = { ecran: string; ouvrir: (page: Page) => Promise<void> };

async function aller(page: Page, adresse: string, titre: string | RegExp) {
    const reponse = await page.goto(adresse);
    expect(reponse?.status()).toBe(200);
    await expect(
        page.getByRole('heading', { level: 1, name: titre }).first(),
    ).toBeVisible(ATTENTE);
}

/** La fiche d'une annale, en « Conditions réelles ». */
async function conditionsReelles(page: Page, session: RegExp) {
    await aller(page, '/eleve/annales', /annales/);
    await page.getByRole('link', { name: session }).first().click();
    await page.getByRole('tab', { name: /Conditions réelles|Examen/ }).click();
    await expect(
        page.getByRole('heading', { name: 'Comme le jour de l’examen' }),
    ).toBeVisible(ATTENTE);
}

async function commencer(page: Page, session: RegExp) {
    await conditionsReelles(page, session);
    await page.getByRole('button', { name: /^Commencer l’examen/ }).click();
    await expect(
        page.getByRole('dialog', { name: /Examen blanc/ }),
    ).toBeVisible(ATTENTE);
}

async function terminer(page: Page) {
    await page.getByRole('button', { name: 'Terminer l’examen' }).click();
    await page
        .getByRole('alertdialog')
        .getByRole('button', { name: 'Terminer' })
        .click();
    // Capture après la fermeture du dialogue (il masque le reste à axe).
    await expect(page.getByRole('alertdialog')).toBeHidden(ATTENTE);
}

const ECRANS: Record<'eleve', Ecran[]> = {
    eleve: [
        {
            ecran: 'annale-conditions-reelles',
            ouvrir: (page) => conditionsReelles(page, /BEPC 2024/),
        },
        {
            ecran: 'examen-passage',
            ouvrir: async (page) => {
                await commencer(page, /BEPC 2024/);
                await page
                    .getByRole('spinbutton')
                    .or(page.getByRole('textbox'))
                    .first()
                    .fill('10');
            },
        },
        {
            ecran: 'examen-evaluation',
            ouvrir: async (page) => {
                await commencer(page, /BEPC 2024/);
                await page.getByRole('button', { name: /^Question 3/ }).click();
                await page.getByRole('textbox').first().fill('E = x² + 6x');
                await terminer(page);
                await expect(page.getByText('Ce que j’ai fait')).toBeVisible(
                    ATTENTE,
                );
                await page.evaluate(() => window.scrollTo(0, 0));
            },
        },
        {
            ecran: 'examen-resultat-local',
            ouvrir: async (page) => {
                await commencer(page, /BEPC 2023/);
                await page.getByRole('textbox').first().fill('4');
                await terminer(page);
                await expect(page.getByText('/20').first()).toBeVisible(
                    ATTENTE,
                );
                await page.evaluate(() => window.scrollTo(0, 0));
            },
        },
        {
            ecran: 'examens-blancs',
            ouvrir: (page) =>
                aller(page, '/eleve/examens-blancs', /examens blancs/),
        },
        {
            ecran: 'examen-blanc-resultat',
            ouvrir: async (page) => {
                await aller(page, '/eleve/examens-blancs', /examens blancs/);
                await page
                    .getByRole('link', { name: /BEPC 2024/ })
                    .first()
                    .click();
                await expect(
                    page.getByRole('heading', { name: 'Partie par partie' }),
                ).toBeVisible(ATTENTE);
            },
        },
    ],
};

for (const gabarit of GABARITS.filter((g) => g.nom !== '412')) {
    for (const theme of THEMES) {
        test.describe(`lot 5 · ${gabarit.nom} × ${theme.nom}`, () => {
            test.use({
                viewport: { width: gabarit.largeur, height: gabarit.hauteur },
                colorScheme: theme.schema,
            });

            test.beforeEach(async ({ page }) => {
                await page.clock.setFixedTime(HORLOGE);
                await page.route('**/sync/operations', async (route) => {
                    const corps = route.request().postDataJSON() as {
                        operations: { uuid: string }[];
                    };
                    await route.fulfill({
                        json: {
                            heure_serveur: new Date().toISOString(),
                            resultats: corps.operations.map((operation) => ({
                                uuid: operation.uuid,
                                verdict: 'reporte',
                                resultat: null,
                            })),
                        },
                    });
                });
            });

            for (const [compte, ecrans] of Object.entries(ECRANS)) {
                test.describe(`connecté (${compte})`, () => {
                    test.use({
                        storageState: SESSIONS[compte as keyof typeof ECRANS],
                    });

                    for (const ecran of ecrans) {
                        test(`lot 5 — ${ecran.ecran}`, async ({ page }) => {
                            await ecran.ouvrir(page);
                            await capturer(
                                page,
                                'lot5',
                                ecran.ecran,
                                gabarit.nom,
                                theme.nom,
                                { figerVariables: true },
                            );
                        });
                    }
                });
            }
        });
    }
}
