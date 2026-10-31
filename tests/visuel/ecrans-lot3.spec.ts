import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { GABARITS, SESSIONS, THEMES, capturer } from './gabarits';

/**
 * Écrans du lot 3 (moteur de questions), sur les données de démonstration
 * (DemoCoursSeeder : tout est « EXEMPLE », dont une question en brouillon
 * et une en relecture). Rien n'est modifié : la file est simulée, et les
 * écrans du back-office sont seulement ouverts.
 *
 * L'ardoise de la séance (tous les types) est capturée par les parcours
 * (parcours-lot2, parcours-lot3), sur des comptes neufs.
 */

const ATTENTE = { timeout: 20_000 };

/** Un jeudi matin à Conakry (UTC+0). */
const HORLOGE = new Date('2026-10-29T10:00:00Z');

type Ecran = { ecran: string; ouvrir: (page: Page) => Promise<void> };

async function aller(page: Page, adresse: string, titre: string | RegExp) {
    const reponse = await page.goto(adresse);
    expect(reponse?.status()).toBe(200);
    await expect(
        page.getByRole('heading', { level: 1, name: titre }).first(),
    ).toBeVisible(ATTENTE);
}

/** Une question s'ouvre depuis la liste par le début de son énoncé (l'uuid change à chaque semis). */
async function question(page: Page, adresse: string, debut: string) {
    await aller(page, adresse, /./);
    await page
        .getByRole('link', { name: new RegExp(`^${debut}`) })
        .first()
        .click();
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);
}

const ECRANS: Record<'contenu' | 'pedagogie' | 'eleve', Ecran[]> = {
    contenu: [
        {
            ecran: 'questions',
            ouvrir: (page) =>
                aller(page, '/contenu/questions', 'La banque de questions'),
        },
        {
            ecran: 'questions-creer',
            ouvrir: (page) =>
                aller(
                    page,
                    '/contenu/questions/creer',
                    'Une nouvelle question',
                ),
        },
        {
            ecran: 'questions-edition',
            ouvrir: async (page) => {
                await question(
                    page,
                    '/contenu/questions?statut=brouillon',
                    'Complète la phrase',
                );
                await page
                    .getByRole('link', { name: 'Continuer la saisie' })
                    .click();
                await expect(
                    page.getByRole('heading', { name: 'L’énoncé' }),
                ).toBeVisible(ATTENTE);
            },
        },
        {
            ecran: 'questions-fiche',
            ouvrir: async (page) => {
                await question(
                    page,
                    '/contenu/questions?type=ordre',
                    'Remets dans l',
                );
                await expect(page.getByText('La bonne réponse')).toBeVisible(
                    ATTENTE,
                );
            },
        },
    ],
    pedagogie: [
        {
            ecran: 'questions-relecture',
            ouvrir: (page) =>
                aller(page, '/contenu/relecture/questions', 'À relire'),
        },
        {
            ecran: 'questions-fiche-relecture',
            ouvrir: async (page) => {
                await question(
                    page,
                    '/contenu/relecture/questions',
                    'Une échelle',
                );
                await expect(
                    page.getByRole('heading', { name: 'À vous de relire' }),
                ).toBeVisible(ATTENTE);
            },
        },
    ],
    eleve: [
        {
            ecran: 'eleve-lecon-mini-question',
            ouvrir: async (page) => {
                await aller(page, '/eleve/cours/maths', /./);
                await page
                    .getByRole('link', { name: /Le cosinus d'un angle aigu/ })
                    .click();
                await expect(
                    page.getByText('Vérifie que tu as compris').last(),
                ).toBeVisible(ATTENTE);
                await page.evaluate(() => window.scrollTo(0, 0));
            },
        },
    ],
};

for (const gabarit of GABARITS.filter((g) => g.nom !== '412')) {
    for (const theme of THEMES) {
        test.describe(`lot 3 · ${gabarit.nom} × ${theme.nom}`, () => {
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
                                verdict: 'acceptee',
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
                        test(`lot 3 — ${ecran.ecran}`, async ({ page }) => {
                            await ecran.ouvrir(page);
                            await capturer(
                                page,
                                'lot3',
                                ecran.ecran,
                                gabarit.nom,
                                theme.nom,
                                {
                                    figerVariables: true,
                                },
                            );
                        });
                    }
                });
            }
        });
    }
}
