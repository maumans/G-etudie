import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import {
    GABARITS,
    SESSIONS,
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
        {
            fullPage: true,
            // Heures de connexion, journal : changent à chaque passage.
            mask: [page.locator('[data-capture="variable"]')],
        },
    );
}

/** Un jeudi matin à Conakry (UTC+0). */
const HORLOGE = new Date('2026-10-29T10:00:00Z');

/**
 * Écrans connectés, par compte de démonstration : adresse, nom de capture,
 * titre attendu, statut HTTP attendu (200 par défaut).
 */
const CONNECTES: Record<
    keyof typeof SESSIONS,
    {
        adresse: string;
        ecran: string;
        titre: string | RegExp;
        statut?: number;
    }[]
> = {
    eleve: [
        { adresse: '/eleve', ecran: 'eleve-accueil', titre: /^Bonjour, / },
        {
            adresse: '/compte/profil',
            ecran: 'compte-profil',
            titre: 'Mon compte',
        },
        {
            adresse: '/compte/numero',
            ecran: 'compte-numero',
            titre: 'Mon compte',
        },
        {
            adresse: '/compte/affichage',
            ecran: 'compte-affichage',
            titre: 'Mon compte',
        },
        // Un élève qui ouvre la console : « Accès réservé », retour à son espace.
        {
            adresse: '/console',
            ecran: 'erreur-403',
            titre: 'Accès réservé',
            statut: 403,
        },
    ],
    contenu: [
        {
            adresse: '/contenu',
            ecran: 'contenu-accueil',
            titre: 'Tableau de bord',
        },
        {
            adresse: '/compte/profil',
            ecran: 'compte-profil-contenu',
            titre: 'Mon compte',
        },
    ],
    console: [
        {
            adresse: '/console',
            ecran: 'console-accueil',
            titre: "Vue d'ensemble",
        },
        {
            adresse: '/compte/securite',
            ecran: 'compte-securite',
            titre: 'Mon compte',
        },
    ],
};

/** Écrans ouverts aux visiteurs (hors vitrine). */
const PUBLICS = [
    { adresse: '/login', ecran: 'connexion', titre: 'Se connecter' },
    { adresse: '/register', ecran: 'inscription', titre: 'Créer un compte' },
    {
        adresse: '/mot-de-passe-oublie',
        ecran: 'mot-de-passe-oublie',
        titre: 'Mot de passe oublié',
    },
];

for (const gabarit of GABARITS) {
    for (const theme of THEMES) {
        test.describe(`${gabarit.nom} × ${theme.nom}`, () => {
            test.use({
                viewport: { width: gabarit.largeur, height: gabarit.hauteur },
                colorScheme: theme.schema,
            });

            // Horloge figée : l'accueil élève affiche la date et salue
            // « Bonjour » ou « Bonsoir » selon l'heure ; sans cela, la capture
            // de référence changerait chaque jour.
            test.beforeEach(async ({ page }) => {
                await page.clock.setFixedTime(HORLOGE);
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

            for (const ecran of PUBLICS) {
                test(`lot 0 — ${ecran.ecran}`, async ({ page }) => {
                    await page.goto(ecran.adresse);
                    await expect(
                        page.getByRole('heading', {
                            level: 1,
                            name: ecran.titre,
                        }),
                    ).toBeVisible();

                    await verifierEtCapturer(
                        page,
                        ecran.ecran,
                        gabarit.nom,
                        theme.nom,
                    );
                });
            }

            for (const [compte, ecrans] of Object.entries(CONNECTES)) {
                test.describe(`connecté (${compte})`, () => {
                    test.use({
                        storageState: SESSIONS[compte as keyof typeof SESSIONS],
                    });

                    for (const ecran of ecrans) {
                        test(`lot 0 — ${ecran.ecran}`, async ({ page }) => {
                            const reponse = await page.goto(ecran.adresse);
                            expect(reponse?.status()).toBe(ecran.statut ?? 200);
                            await expect(
                                ecran.statut === 403
                                    ? page.getByText(ecran.titre, {
                                          exact: true,
                                      })
                                    : page.getByRole('heading', {
                                          level: 1,
                                          name: ecran.titre,
                                      }),
                            ).toBeVisible();

                            await verifierEtCapturer(
                                page,
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
