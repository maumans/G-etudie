import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { GABARITS, SESSIONS, THEMES, capturer } from './gabarits';

/**
 * Écrans du lot 6 (progression et motivation), sur les données de
 * démonstration : Aïssatou (01, BEPC) a quelques soirs de réponses passées
 * par les vrais services, recalculées par `progression:recalculer` ;
 * Ousmane (09, Bac SE) n'a encore rien fait (questions d'exemple, aucune réponse). Les dates qui changent chaque jour
 * (série, défi, prochaine révision) sont masquées (`data-capture`).
 *
 * L'accueil (série sur deux semaines, défi, réussites) est capturé par
 * ecrans-lot2.spec.ts ; le scénario de jauge par JaugeScenarioTest.
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

const ECRANS: Record<'eleve' | 'ousmane', Ecran[]> = {
    eleve: [
        {
            ecran: 'progression',
            ouvrir: (page) =>
                aller(page, '/eleve/progression', 'Ma progression'),
        },
        {
            ecran: 'matiere-a-travailler',
            ouvrir: async (page) => {
                await aller(page, '/eleve/cours/maths', 'Mathématiques');
                await page.getByRole('link', { name: 'À travailler' }).click();
                await expect(
                    page.getByRole('link', { name: 'À travailler' }),
                ).toHaveAttribute('aria-current', 'page', ATTENTE);
            },
        },
    ],
    ousmane: [
        {
            ecran: 'progression-debut',
            ouvrir: (page) =>
                aller(page, '/eleve/progression', 'Ma progression'),
        },
    ],
};

for (const gabarit of GABARITS.filter((g) => g.nom !== '412')) {
    for (const theme of THEMES) {
        test.describe(`lot 6 · ${gabarit.nom} × ${theme.nom}`, () => {
            test.use({
                viewport: { width: gabarit.largeur, height: gabarit.hauteur },
                colorScheme: theme.schema,
            });

            test.beforeEach(async ({ page }) => {
                await page.clock.setFixedTime(HORLOGE);
            });

            for (const [compte, ecrans] of Object.entries(ECRANS)) {
                test.describe(`connecté (${compte})`, () => {
                    test.use({
                        storageState: SESSIONS[compte as keyof typeof ECRANS],
                    });

                    for (const ecran of ecrans) {
                        test(`lot 6 — ${ecran.ecran}`, async ({ page }) => {
                            await ecran.ouvrir(page);
                            await capturer(
                                page,
                                'lot6',
                                ecran.ecran,
                                gabarit.nom,
                                theme.nom,
                            );
                        });
                    }
                });
            }
        });
    }
}
