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
 * Écrans du lot 9 (abonnements, paiements, codes prépayés), sur les
 * données de démonstration (DemoAbonnementsSeeder) :
 *
 * - « Mon abonnement » d'Aïssatou (01, gratuite : quota d'examens blancs,
 *   formules, code, historique avec un essai refusé) et d'Ousmane (09,
 *   abonné : période en cours) ;
 * - « Payer » (formule année) ;
 * - un sujet au corrigé réservé (BEPC 2023, Aïssatou) ;
 * - console : codes prépayés (liste, lot d'exemple), paiements.
 */

const ATTENTE = { timeout: 30_000 };

/** Un jeudi matin à Conakry (UTC+0). */
const HORLOGE = new Date('2026-11-05T10:00:00Z');

type Ecran = {
    ecran: string;
    session: keyof typeof SESSIONS;
    ouvrir: (page: Page) => Promise<void>;
};

const titre = (page: Page, nom: RegExp) =>
    expect(page.getByRole('heading', { level: 1, name: nom })).toBeVisible(
        ATTENTE,
    );

const ECRANS: Ecran[] = [
    {
        ecran: 'abonnement-gratuit',
        session: 'eleve',
        ouvrir: async (page) => {
            await page.goto('/eleve/abonnement');
            await titre(page, /Ton abonnement/);
        },
    },
    {
        ecran: 'abonnement-abonne',
        session: 'ousmane',
        ouvrir: async (page) => {
            await page.goto('/eleve/abonnement');
            await expect(page.getByText(/Abonné ·/)).toBeVisible(ATTENTE);
        },
    },
    {
        ecran: 'payer',
        session: 'eleve',
        ouvrir: async (page) => {
            await page.goto('/eleve/abonnement/payer/annee');
            await titre(page, /Payer/);
        },
    },
    {
        ecran: 'annale-corrige-reserve',
        session: 'eleve',
        ouvrir: async (page) => {
            await page.goto('/eleve/sujets');
            await page
                .getByRole('link', { name: /BEPC 2023/ })
                .first()
                .click();
            await expect(
                page.getByText('Corrigé détaillé avec l’abonnement'),
            ).toBeVisible(ATTENTE);
        },
    },
    {
        ecran: 'console-codes',
        session: 'console',
        ouvrir: async (page) => {
            await page.goto('/console/codes');
            await titre(page, /Codes prépayés/);
        },
    },
    {
        ecran: 'console-lot',
        session: 'console',
        ouvrir: async (page) => {
            await page.goto('/console/codes');
            await page
                .getByRole('link', { name: /Lot de démonstration/ })
                .click();
            await expect(page.getByText(/codes à remettre/)).toBeVisible(
                ATTENTE,
            );
        },
    },
    {
        ecran: 'console-paiements',
        session: 'console',
        ouvrir: async (page) => {
            await page.goto('/console/paiements');
            await titre(page, /Les paiements/);
        },
    },
];

for (const gabarit of GABARITS.filter((g) => g.nom !== '412')) {
    for (const theme of THEMES) {
        test.describe(`lot 9 · ${gabarit.nom} × ${theme.nom}`, () => {
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

                    test(`lot 9 — ${ecran.ecran}`, async ({ page }) => {
                        await ecran.ouvrir(page);
                        await page.waitForTimeout(300);
                        await capturer(
                            page,
                            'lot9',
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
