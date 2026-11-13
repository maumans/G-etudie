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
 * Écrans du lot 10 (tuteur N'karamögö), sur les conversations de
 * démonstration (DemoTuteurSeeder, marquées « EXEMPLE ») :
 *
 * - « Mon tuteur » d'Aïssatou (01, gratuite) : question libre, quota du
 *   jour, ses conversations ; puis une conversation ouverte ;
 * - back-office (06, responsable pédagogique) : le journal, une
 *   conversation (signalée) ;
 * - console (08) : usage et coût.
 *
 * La feuille « Explique-moi » est capturée par le parcours du critère
 * (parcours-lot10.spec.ts), avec une explication réellement diffusée.
 */

const ATTENTE = { timeout: 30_000 };

/** Un jeudi soir à Conakry (UTC+0), l'heure des révisions. */
const HORLOGE = new Date('2026-11-12T19:00:00Z');

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
        ecran: 'eleve-tuteur',
        session: 'eleve',
        ouvrir: async (page) => {
            await page.goto('/eleve/tuteur');
            await titre(page, /Ton tuteur/);
            await expect(page.getByText('Pose ta question')).toBeVisible();
        },
    },
    {
        ecran: 'eleve-tuteur-conversation',
        session: 'eleve',
        ouvrir: async (page) => {
            await page.goto('/eleve/tuteur');
            await page
                .getByRole('region', { name: 'Tes conversations' })
                .getByRole('link')
                .filter({ hasText: 'Sur une question' })
                .first()
                .click();
            await expect(
                page.getByRole('list', {
                    name: 'Conversation avec le tuteur',
                }),
            ).toBeVisible(ATTENTE);
            await expect(page.locator('.katex').first()).toBeVisible();
        },
    },
    {
        ecran: 'contenu-tuteur',
        session: 'pedagogie',
        ouvrir: async (page) => {
            await page.goto('/contenu/tuteur');
            await titre(page, /tuteur/);
        },
    },
    {
        ecran: 'contenu-tuteur-fiche',
        session: 'pedagogie',
        ouvrir: async (page) => {
            await page.goto('/contenu/tuteur?signalees=1');
            await page
                .getByRole('region', { name: 'Le journal' })
                .getByRole('link')
                .first()
                .click();
            await expect(page.getByText(/^Signalée :/)).toBeVisible(ATTENTE);
        },
    },
    {
        ecran: 'console-tuteur',
        session: 'console',
        ouvrir: async (page) => {
            await page.goto('/console/tuteur');
            await titre(page, /tuteur/);
        },
    },
];

for (const gabarit of GABARITS.filter((g) => g.nom !== '412')) {
    for (const theme of THEMES) {
        test.describe(`lot 10 · ${gabarit.nom} × ${theme.nom}`, () => {
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

                    test(`lot 10 — ${ecran.ecran}`, async ({ page }) => {
                        await ecran.ouvrir(page);
                        await page.waitForTimeout(300);
                        await capturer(
                            page,
                            'lot10',
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
