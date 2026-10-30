import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { GABARITS, SESSIONS, THEMES, capturer } from './gabarits';

/**
 * Écrans du lot 1 (référentiel et back-office contenu), sur les données de
 * démonstration (DemoContenuSeeder, toutes marquées « EXEMPLE »). Une leçon
 * s'ouvre par son titre dans la liste : son identifiant change à chaque
 * `db:seed`, pas son titre.
 */

/** Un jeudi matin à Conakry (UTC+0). */
const HORLOGE = new Date('2026-10-29T10:00:00Z');

type Ecran = {
    ecran: string;
    /** Adresse, ou chemin pour y arriver depuis la liste des leçons. */
    ouvrir: string | { lecon: string; edition?: boolean };
    titre: string | RegExp;
};

const ECRANS: Record<'pedagogie' | 'contenu', Ecran[]> = {
    pedagogie: [
        {
            ecran: 'contenu-accueil-pedagogie',
            ouvrir: '/contenu',
            titre: /^Bon(jour|soir), Alpha$/,
        },
        {
            ecran: 'referentiel-matieres',
            ouvrir: '/contenu/referentiel/matieres',
            titre: 'Le référentiel pédagogique',
        },
        {
            ecran: 'referentiel-epreuves',
            ouvrir: '/contenu/referentiel/epreuves',
            titre: 'Le référentiel pédagogique',
        },
        {
            ecran: 'referentiel-programme',
            ouvrir: '/contenu/referentiel/programme',
            titre: 'Le référentiel pédagogique',
        },
        {
            ecran: 'referentiel-annees',
            ouvrir: '/contenu/referentiel/annees',
            titre: 'Le référentiel pédagogique',
        },
        { ecran: 'relecture', ouvrir: '/contenu/relecture', titre: 'À relire' },
        {
            ecran: 'lecon-a-relire',
            ouvrir: { lecon: "Démontrer qu'un triangle est rectangle" },
            titre: "Démontrer qu'un triangle est rectangle",
        },
    ],
    contenu: [
        {
            ecran: 'contenu-accueil-redacteur',
            ouvrir: '/contenu',
            titre: /^Bon(jour|soir), Ibrahima$/,
        },
        { ecran: 'lecons', ouvrir: '/contenu/lecons', titre: 'Les leçons' },
        {
            ecran: 'lecon-creer',
            ouvrir: '/contenu/lecons/creer',
            titre: 'Une nouvelle leçon',
        },
        {
            ecran: 'lecon-edition',
            ouvrir: { lecon: 'Les identités remarquables', edition: true },
            titre: 'Les identités remarquables · Édition',
        },
        {
            ecran: 'lecon-publiee',
            ouvrir: { lecon: 'Le théorème de Pythagore' },
            titre: 'Le théorème de Pythagore',
        },
    ],
};

async function ouvrir(page: Page, ecran: Ecran): Promise<void> {
    if (typeof ecran.ouvrir === 'string') {
        const reponse = await page.goto(ecran.ouvrir);
        expect(reponse?.status()).toBe(200);
        await expect(
            page.getByRole('heading', { level: 1, name: ecran.titre }),
        ).toBeVisible();

        return;
    }

    await page.goto('/contenu/lecons');
    await page
        .getByRole('link', { name: ecran.ouvrir.lecon, exact: true })
        .click();
    await expect(
        page.getByRole('heading', { level: 1, name: ecran.titre }),
    ).toBeVisible();

    if (ecran.ouvrir.edition) {
        await page
            .getByRole('link', { name: 'Continuer la rédaction' })
            .click();
        await expect(page).toHaveTitle(new RegExp(String(ecran.titre)));
        await expect(
            page.getByRole('textbox', { name: 'Contenu de la leçon' }),
        ).toBeVisible();
    }
}

for (const gabarit of GABARITS) {
    for (const theme of THEMES) {
        test.describe(`lot 1 · ${gabarit.nom} × ${theme.nom}`, () => {
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
                        test(`lot 1 — ${ecran.ecran}`, async ({ page }) => {
                            await ouvrir(page, ecran);
                            await capturer(
                                page,
                                'lot1',
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
