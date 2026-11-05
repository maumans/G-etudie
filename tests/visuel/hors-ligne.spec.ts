import { expect, test } from '@playwright/test';
import { SESSIONS } from './gabarits';

/**
 * Socle hors ligne (HORS_LIGNE.md A.3), dans un vrai navigateur et sur le
 * build : service worker, copies des écrans gardés, garde de navigation,
 * page de repli, retour du réseau. La séance complète hors ligne (A.14
 * n° 24) viendra avec le premier geste élève, au lot 3.
 */
test.use({
    storageState: SESSIONS.eleve,
    viewport: { width: 360, height: 740 },
});

test('hors ligne : jamais de clic mort, copie datée, page de repli, retour du réseau', async ({
    page,
    context,
}) => {
    await page.goto('/eleve');
    await page.waitForFunction(
        () => navigator.serviceWorker?.controller !== null,
        null,
        { timeout: 30_000 },
    );

    // Une visite en ligne range la copie complète de l'accueil. Le premier
    // contact (`/sync/etat`) doit être revenu avant la coupure : une réponse
    // encore en route arriverait après et remettrait, à raison, « en ligne ».
    const premierContact = page.waitForResponse(/\/sync\/etat/);
    await page.reload();
    await premierContact;
    await expect(
        page.getByRole('button', { name: /Tout est envoyé/ }),
    ).toBeVisible();

    // L'appareil s'est enregistré au premier contact.
    await expect
        .poll(() =>
            page.evaluate(
                () =>
                    new Promise<boolean>((resoudre) => {
                        const ouverture = indexedDB.open('nkaramogo');
                        ouverture.onsuccess = () => {
                            const lecture = ouverture.result
                                .transaction('meta')
                                .objectStore('meta')
                                .get('appareil');
                            lecture.onsuccess = () =>
                                resoudre(Boolean(lecture.result?.valeur));
                        };
                    }),
            ),
        )
        .toBe(true);

    await context.setOffline(true);

    // Écran hors liste blanche : un dialogue, et l'élève reste où il est.
    await page.getByRole('link', { name: 'Moi' }).first().click();
    await expect(
        page.getByRole('dialog', { name: 'Cet écran demande une connexion' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Compris' }).click();
    await expect(page).toHaveURL(/\/eleve$/);
    await expect(
        page.getByRole('button', { name: /Hors ligne/ }),
    ).toBeVisible();

    // Rechargement complet sans réseau : la copie gardée, datée.
    await page.reload();
    // « Bonjour » ou « Bonsoir » selon l’heure : le test ne fige pas l’horloge.
    await expect(page.getByText(/^(Bonjour|Bonsoir), /)).toBeVisible();
    await expect(
        page.getByText(
            /^Accueil au .+ dernière version gardée sur ce téléphone$/,
        ),
    ).toBeVisible();
    await expect(
        page.getByText(/^Pas de connexion\. Tes réponses sont gardées/),
    ).toBeVisible();

    // Adresse tapée sans copie : la page de repli, pas une erreur du navigateur.
    await page.goto('/compte/numero');
    await expect(
        page.getByRole('heading', { name: 'Cet écran demande une connexion' }),
    ).toBeVisible();

    // Retour du réseau : la page de repli se recharge seule et l'écran
    // demandé s'ouvre ; puis l'accueil, normalement, sans bandeau.
    await context.setOffline(false);
    await expect(
        page.getByRole('heading', { level: 1, name: 'Mon compte' }),
    ).toBeVisible({ timeout: 15_000 });
    await page.goto('/eleve');
    await expect(
        page.getByRole('button', { name: /Tout est envoyé/ }),
    ).toBeVisible();
    await expect(page.getByText(/dernière version gardée/)).toHaveCount(0);
});
