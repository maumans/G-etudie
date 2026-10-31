import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { GABARITS, SESSIONS, THEMES, capturer } from './gabarits';

/**
 * Écrans du lot 2 (cours côté élève), sur les données de démonstration
 * (DemoCoursSeeder, DemoEleveSeeder : tout est marqué « EXEMPLE »).
 *
 * Ouvrir une leçon est un geste de la file (`lecon.progression`) : il
 * changerait l'accueil des élèves de démonstration d'un passage à l'autre.
 * La synchronisation est donc simulée ici (tout est « acceptée », rien
 * n'arrive au serveur). L'accueil d'Aïssatou est capturé au lot 0
 * (ecrans.spec.ts) ; la séance et le parcours d'accueil, sur un compte neuf
 * (parcours-lot2.spec.ts).
 */

const ATTENTE = { timeout: 20_000 };

/** Un jeudi matin à Conakry (UTC+0). */
const HORLOGE = new Date('2026-10-29T10:00:00Z');

type Ecran = { ecran: string; ouvrir: (page: Page) => Promise<void> };

async function aller(page: Page, adresse: string, titre: string | RegExp) {
    const reponse = await page.goto(adresse);
    expect(reponse?.status()).toBe(200);
    await expect(
        page.getByRole('heading', { level: 1, name: titre }),
    ).toBeVisible(ATTENTE);
}

/** Une leçon s'ouvre par son titre depuis sa matière : l'uuid change à chaque semis. */
async function lecon(page: Page, matiere: string, titre: string) {
    await aller(page, `/eleve/cours/${matiere}`, /./);
    await page.getByRole('link', { name: new RegExp(titre) }).click();
    await expect(
        page.getByRole('heading', { level: 1, name: titre }),
    ).toBeVisible(ATTENTE);
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => window.scrollTo(0, 0));
}

const ECRANS: Record<'eleve' | 'ousmane', Ecran[]> = {
    eleve: [
        {
            ecran: 'eleve-cours',
            ouvrir: (page) => aller(page, '/eleve/cours', 'Mes cours'),
        },
        {
            ecran: 'eleve-matiere',
            ouvrir: (page) =>
                aller(page, '/eleve/cours/maths', 'Mathématiques'),
        },
        {
            ecran: 'eleve-lecon',
            ouvrir: (page) =>
                lecon(page, 'maths', 'Résoudre une équation du premier degré'),
        },
        {
            ecran: 'eleve-fiche',
            ouvrir: async (page) => {
                await aller(page, '/eleve/cours/maths', 'Mathématiques');
                await page
                    .getByRole('link', { name: 'Fiche de révision' })
                    .first()
                    .click();
                await expect(
                    page.getByRole('heading', {
                        level: 1,
                        name: 'Géométrie du triangle rectangle',
                    }),
                ).toBeVisible(ATTENTE);
            },
        },
        {
            ecran: 'eleve-mon-examen',
            ouvrir: (page) =>
                aller(page, '/eleve/bienvenue', /Quel examen prépares-tu/),
        },
    ],
    ousmane: [
        {
            ecran: 'eleve-accueil-nouveau',
            ouvrir: (page) => aller(page, '/eleve', /^Bonjour, Ousmane$/),
        },
        {
            ecran: 'eleve-cours-bac-se',
            ouvrir: (page) => aller(page, '/eleve/cours', 'Mes cours'),
        },
    ],
};

for (const gabarit of GABARITS) {
    for (const theme of THEMES) {
        test.describe(`lot 2 · ${gabarit.nom} × ${theme.nom}`, () => {
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
                        test(`lot 2 — ${ecran.ecran}`, async ({ page }) => {
                            await ecran.ouvrir(page);
                            await capturer(
                                page,
                                'lot2',
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
