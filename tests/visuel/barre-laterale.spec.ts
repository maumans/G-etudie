import { expect, test } from '@playwright/test';
import { SESSIONS } from './gabarits';

/**
 * Sur un écran d'ordinateur bas (portable, fenêtre réduite), la barre
 * latérale ne coupe jamais son pied : « Mon compte » et « Se déconnecter »
 * (personnel), la carte de l'élève (profils, déconnexion). Avant le
 * 2026-11-25, une longue liste de liens (un administrateur voit la console
 * et le back-office) poussait le pied hors de l'écran, sans défilement
 * (DEVBOOK, point 37). La liste défile désormais ; le pied reste en place.
 */

const ATTENTE = { timeout: 30_000 };

test.use({ viewport: { width: 1366, height: 560 } });

for (const [nom, session, adresse] of [
    ['console', SESSIONS.console, '/console'],
    ['back-office', SESSIONS.pedagogie, '/contenu'],
] as const) {
    test.describe(nom, () => {
        test.use({ storageState: session });

        test(`${nom} : le pied de la barre reste à l’écran, la liste défile`, async ({
            page,
        }) => {
            await page.goto(adresse);
            const barre = page.locator('aside').first();
            await expect(barre).toBeVisible(ATTENTE);

            await expect(
                barre.getByRole('button', { name: 'Se déconnecter' }),
            ).toBeInViewport();
            await expect(
                barre.getByRole('link', { name: 'Mon compte' }),
            ).toBeInViewport();

            // Le dernier lien de la liste s'atteint en la faisant défiler.
            const liens = barre.getByRole('navigation').getByRole('link');
            const dernier = liens.last();
            await dernier.scrollIntoViewIfNeeded();
            await expect(dernier).toBeInViewport();
            // Et le pied n'a pas bougé.
            await expect(
                barre.getByRole('button', { name: 'Se déconnecter' }),
            ).toBeInViewport();

            // Relecture humaine (REVUE=dossier).
            if (process.env.REVUE) {
                await page.screenshot({
                    path: `${process.env.REVUE}/barre-laterale-${nom}.png`,
                });
            }
        });
    });
}

test.describe('espace élève', () => {
    test.use({ storageState: SESSIONS.eleve });

    test('la carte de l’élève reste à l’écran, la liste défile', async ({
        page,
    }) => {
        await page.goto('/eleve');
        const barre = page.locator('aside').first();
        await expect(barre).toBeVisible(ATTENTE);

        await expect(
            barre.getByRole('button', { name: /Qui révise/ }),
        ).toBeInViewport();

        const dernier = barre
            .getByRole('navigation', { name: 'Espace élève' })
            .getByRole('link')
            .last();
        await dernier.scrollIntoViewIfNeeded();
        await expect(dernier).toBeInViewport();
        await expect(
            barre.getByRole('button', { name: /Qui révise/ }),
        ).toBeInViewport();
    });
});
