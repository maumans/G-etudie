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
 * Écrans du lot 14 (terrain) : Console › Terrain sur l'essai fictif de
 * DemoTerrainSeeder (bandeau « EXEMPLE »), compte 08 Sékou ; et, côté
 * élève (01 Aïssatou), « Mon compte › Appareils › Cet appareil » avec la
 * carte « Ton avis » ouverte. Rien n'est envoyé : ni avis, ni diagnostic
 * (leur envoi se teste dans Pest, par la file).
 *
 * Les valeurs lues sur l'appareil (stockage, navigateur) changent d'une
 * machine à l'autre : elles sont masquées (`data-capture="variable"`).
 */

const ATTENTE = { timeout: 30_000 };

/** Le jour du semis de la démonstration. */
const HORLOGE = new Date('2026-11-20T12:45:00Z');

type Ecran = {
    ecran: string;
    session: string;
    figer: boolean;
    ouvrir: (page: Page) => Promise<void>;
};

const titreConsole = (page: Page) =>
    expect(
        page.getByRole('heading', { level: 1, name: /les élèves/ }),
    ).toBeVisible(ATTENTE);

/** La campagne d'exemple : ses dates suivent le semis. */
async function choisirCampagne(page: Page, vue: string): Promise<void> {
    await page.goto(`/console/terrain?vue=${vue}`);
    await titreConsole(page);
    await page
        .getByRole('combobox', { name: 'Campagne d’essai' })
        .selectOption({ label: 'Essai d’exemple — Ratoma' });
    await expect(page.getByText('Conakry, Ratoma').first()).toBeVisible(
        ATTENTE,
    );
}

const ECRANS: Ecran[] = [
    {
        ecran: 'console-terrain-avis',
        session: SESSIONS.console,
        figer: true,
        ouvrir: async (page) => {
            await choisirCampagne(page, 'avis');
            await expect(page.getByText('Ce qui gêne')).toBeVisible();
        },
    },
    {
        ecran: 'console-terrain-erreurs',
        session: SESSIONS.console,
        figer: true,
        ouvrir: async (page) => {
            await choisirCampagne(page, 'erreurs');
            await expect(
                page.getByText(/Page qui ne se charge pas/),
            ).toBeVisible();
        },
    },
    {
        ecran: 'console-terrain-diagnostics',
        session: SESSIONS.console,
        figer: true,
        ouvrir: async (page) => {
            await choisirCampagne(page, 'diagnostics');
            await expect(page.getByText('7K3FQX')).toBeVisible();
        },
    },
    {
        ecran: 'eleve-cet-appareil',
        session: SESSIONS.eleve,
        figer: false,
        ouvrir: async (page) => {
            await page.goto('/compte/appareils');
            await expect(
                page.getByRole('heading', { name: 'Cet appareil' }),
            ).toBeVisible(ATTENTE);
            await expect(page.getByText('Mode hors ligne')).toBeVisible(
                ATTENTE,
            );
            await page.getByRole('button', { name: 'Donner mon avis' }).click();
            await page.getByRole('radio', { name: 'Un peu' }).click();
            await page.getByRole('button', { name: 'C’est lent' }).click();
        },
    },
];

for (const gabarit of GABARITS.filter((g) => g.nom !== '412')) {
    for (const theme of THEMES) {
        test.describe(`lot 14 · ${gabarit.nom} × ${theme.nom}`, () => {
            test.use({
                viewport: { width: gabarit.largeur, height: gabarit.hauteur },
                colorScheme: theme.schema,
            });

            for (const ecran of ECRANS) {
                test.describe(ecran.ecran, () => {
                    test.use({ storageState: ecran.session });

                    test(`lot 14 — ${ecran.ecran}`, async ({ page }) => {
                        await figerHorloges(page, HORLOGE);
                        await ecran.ouvrir(page);
                        await page.waitForTimeout(300);

                        // Relecture humaine sans masques (REVUE=dossier) :
                        // la capture de référence masque les valeurs lues
                        // sur l'appareil, qu'il faut pourtant regarder.
                        if (process.env.REVUE) {
                            await page.screenshot({
                                path: `${process.env.REVUE}/${ecran.ecran}-${gabarit.nom}-${theme.nom}.png`,
                                fullPage: true,
                            });
                        }

                        await capturer(
                            page,
                            'lot14',
                            ecran.ecran,
                            gabarit.nom,
                            theme.nom,
                            { figerVariables: ecran.figer },
                        );
                    });
                });
            }
        });
    }
}
