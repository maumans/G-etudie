import { expect, test } from '@playwright/test';
import {
    GABARITS,
    THEMES,
    verifierAccessibilite,
    verifierSansDebordement,
} from './gabarits';

/**
 * Écrans clés, capturés dans chaque gabarit et chaque thème. Une différence
 * non voulue avec la capture de référence fait échouer la suite.
 */
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
                await page.evaluate(() => document.fonts.ready);

                await verifierSansDebordement(page);
                await verifierAccessibilite(page);
                // Tableau de segments : une chaîne « lot0/… » serait aplatie
                // en « lot0-… » par Playwright.
                await expect(page).toHaveScreenshot(
                    ['lot0', `composants-${gabarit.nom}-${theme.nom}.png`],
                    { fullPage: true },
                );
            });
        });
    }
}
