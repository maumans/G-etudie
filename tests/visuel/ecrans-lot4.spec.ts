import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { GABARITS, SESSIONS, THEMES, capturer } from './gabarits';

/**
 * Écrans du lot 4 (annales, import assisté, signalements), sur les données
 * de démonstration (DemoAnnalesSeeder : tout est « EXEMPLE » — trois
 * annales publiées, une en brouillon avec des réponses à vérifier, deux
 * signalements d'Aïssatou). Rien n'est modifié : la file est simulée, les
 * écrans du back-office sont seulement ouverts.
 *
 * L'import de bout en bout (téléversement → annale publiée → lue par
 * l'élève) : parcours-lot4.spec.ts.
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

/** Une annale s'ouvre depuis une liste par son libellé (l'uuid change à chaque semis). */
async function ouvrir(page: Page, adresse: string, lien: RegExp) {
    await aller(page, adresse, /./);
    await page.getByRole('link', { name: lien }).first().click();
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);
}

const ECRANS: Record<'contenu' | 'pedagogie' | 'eleve', Ecran[]> = {
    contenu: [
        {
            ecran: 'annales',
            ouvrir: (page) => aller(page, '/contenu/annales', 'Les annales'),
        },
        {
            ecran: 'annales-importer',
            ouvrir: (page) =>
                aller(page, '/contenu/annales/importer', 'Importer un sujet'),
        },
        {
            ecran: 'annales-fiche-a-verifier',
            ouvrir: async (page) => {
                await ouvrir(
                    page,
                    '/contenu/annales?statut=brouillon',
                    /BEPC 2022/,
                );
                await expect(page.getByText(/à vérifier/).first()).toBeVisible(
                    ATTENTE,
                );
            },
        },
    ],
    pedagogie: [
        {
            ecran: 'annales-fiche-publiee',
            ouvrir: async (page) => {
                await ouvrir(
                    page,
                    '/contenu/annales?statut=publie',
                    /BEPC 2024/,
                );
                await expect(page.getByText('En ligne').first()).toBeVisible(
                    ATTENTE,
                );
            },
        },
        {
            ecran: 'signalements',
            ouvrir: (page) =>
                aller(page, '/contenu/signalements', /signalements/),
        },
        {
            ecran: 'signalements-fiche',
            ouvrir: async (page) => {
                await ouvrir(
                    page,
                    '/contenu/signalements',
                    /Le corrigé est faux/,
                );
                await expect(
                    page.getByRole('heading', { name: 'Répondre à l’élève' }),
                ).toBeVisible(ATTENTE);
            },
        },
    ],
    eleve: [
        {
            ecran: 'eleve-annales',
            ouvrir: (page) => aller(page, '/eleve/annales', /annales/),
        },
        {
            ecran: 'eleve-annales-exercices',
            ouvrir: async (page) => {
                await aller(page, '/eleve/annales?vue=exercices', /annales/);
                await expect(
                    page.getByRole('tab', { name: /Exercices par chapitre/ }),
                ).toHaveAttribute('aria-selected', 'true');
            },
        },
        {
            ecran: 'eleve-annale-lecture',
            ouvrir: async (page) => {
                await ouvrir(page, '/eleve/annales', /BEPC 2024/);
                await page
                    .getByRole('button', { name: 'Voir le corrigé' })
                    .first()
                    .click();
                await expect(
                    page
                        .getByRole('region', { name: 'Corrigé pas à pas' })
                        .first(),
                ).toBeVisible(ATTENTE);
                await page.evaluate(() => window.scrollTo(0, 0));
            },
        },
        {
            ecran: 'eleve-annale-entrainement',
            ouvrir: async (page) => {
                await ouvrir(page, '/eleve/annales', /BEPC 2023/);
                await page.getByRole('tab', { name: /Entraînement/ }).click();
                await expect(page.getByText(/sur 3/)).toBeVisible(ATTENTE);
            },
        },
        {
            ecran: 'eleve-signaler',
            ouvrir: async (page) => {
                await ouvrir(page, '/eleve/annales', /BEPC 2023/);
                await page.getByRole('tab', { name: /Entraînement/ }).click();
                await page
                    .getByRole('button', { name: 'Signaler une erreur' })
                    .first()
                    .click();
                await page
                    .getByRole('radio', { name: /Le corrigé est faux/ })
                    .click();
                await expect(
                    page.getByRole('button', {
                        name: 'Envoyer le signalement',
                    }),
                ).toBeEnabled(ATTENTE);
                // Capture stable : la feuille en haut, sans focus.
                await page.evaluate(() => {
                    (document.activeElement as HTMLElement | null)?.blur();
                    for (const zone of document.querySelectorAll(
                        '[role="dialog"], [role="dialog"] *',
                    )) {
                        zone.scrollTop = 0;
                    }
                });
            },
        },
        {
            ecran: 'eleve-signalements',
            ouvrir: (page) =>
                aller(page, '/eleve/signalements', /signalements/),
        },
    ],
};

for (const gabarit of GABARITS.filter((g) => g.nom !== '412')) {
    for (const theme of THEMES) {
        test.describe(`lot 4 · ${gabarit.nom} × ${theme.nom}`, () => {
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
                        test(`lot 4 — ${ecran.ecran}`, async ({ page }) => {
                            await ecran.ouvrir(page);
                            await capturer(
                                page,
                                'lot4',
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
