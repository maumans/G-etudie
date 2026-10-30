import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import {
    GABARITS,
    SESSION,
    THEMES,
    verifierAccessibilite,
    verifierSansDebordement,
} from './gabarits';

/**
 * Écrans clés, capturés dans chaque gabarit et chaque thème. Une différence
 * non voulue avec la capture de référence fait échouer la suite.
 */
async function verifierEtCapturer(
    page: Page,
    ecran: string,
    gabarit: string,
    theme: string,
): Promise<void> {
    await page.evaluate(() => document.fonts.ready);
    await verifierSansDebordement(page);
    await verifierAccessibilite(page);
    // Tableau de segments : une chaîne « lot0/… » serait aplatie en « lot0-… ».
    await expect(page).toHaveScreenshot(
        ['lot0', `${ecran}-${gabarit}-${theme}.png`],
        { fullPage: true },
    );
}

/** Entrées des espaces connectés : adresse, nom de capture, titre attendu. */
const ESPACES = [
    { adresse: '/eleve', ecran: 'eleve-accueil', titre: /^Bonjour/ },
    {
        adresse: '/contenu',
        ecran: 'contenu-accueil',
        titre: 'Tableau de bord',
    },
    { adresse: '/console', ecran: 'console-accueil', titre: "Vue d'ensemble" },
];

for (const gabarit of GABARITS) {
    for (const theme of THEMES) {
        test.describe(`${gabarit.nom} × ${theme.nom}`, () => {
            test.use({
                viewport: { width: gabarit.largeur, height: gabarit.hauteur },
                colorScheme: theme.schema,
            });

            test('lot 0 — catalogue des composants', async ({ page }) => {
                await page.goto('/dev/composants');
                await expect(
                    page.getByRole('heading', {
                        name: 'Catalogue des composants',
                    }),
                ).toBeVisible();

                await verifierEtCapturer(
                    page,
                    'composants',
                    gabarit.nom,
                    theme.nom,
                );
            });

            test("lot 0 — page d'erreur 404", async ({ page }) => {
                const reponse = await page.goto('/adresse-qui-n-existe-pas');
                expect(reponse?.status()).toBe(404);
                await expect(
                    page.getByText('Page introuvable', { exact: true }),
                ).toBeVisible();

                await verifierEtCapturer(
                    page,
                    'erreur-404',
                    gabarit.nom,
                    theme.nom,
                );
            });

            test('lot 0 — vitrine', async ({ page }) => {
                await page.goto('/');
                await expect(
                    page.getByRole('heading', { level: 1 }),
                ).toBeVisible();

                await verifierEtCapturer(
                    page,
                    'vitrine-accueil',
                    gabarit.nom,
                    theme.nom,
                );
            });

            test.describe('connecté', () => {
                test.use({ storageState: SESSION });

                for (const espace of ESPACES) {
                    test(`lot 0 — ${espace.ecran}`, async ({ page }) => {
                        await page.goto(espace.adresse);
                        await expect(
                            page.getByRole('heading', {
                                level: 1,
                                name: espace.titre,
                            }),
                        ).toBeVisible();

                        await verifierEtCapturer(
                            page,
                            espace.ecran,
                            gabarit.nom,
                            theme.nom,
                        );
                    });
                }
            });
        });
    }
}
