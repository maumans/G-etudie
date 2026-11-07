import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { GABARITS, THEMES, capturer } from './gabarits';

/**
 * Écrans du lot 8 (vitrine finale), sans compte, sur les données de
 * démonstration :
 *
 * - l'accueil public complet : question jouable (chargée à l'approche),
 *   annales en accès libre, tarifs, questions — la page entière ;
 * - la question jouable après « Vérifier » (verdict et corrigé) ;
 * - la liste des annales publiques ;
 * - un sujet public (BEPC 2024, exemple) : énoncé, corrigé réservé,
 *   partage WhatsApp.
 */

const ATTENTE = { timeout: 30_000 };

/** Un samedi matin à Conakry (UTC+0). */
const HORLOGE = new Date('2026-11-07T10:00:00Z');

/**
 * Faire défiler la page jusqu'en bas puis revenir : les sections rendues
 * à l'approche (`rendu-differe`, question jouable) sont toutes peintes
 * avant la capture pleine page.
 */
async function parcourir(page: Page): Promise<void> {
    const hauteur = await page.evaluate(() => document.body.scrollHeight);

    for (let y = 0; y < hauteur; y += 600) {
        await page.mouse.wheel(0, 600);
        await page.waitForTimeout(40);
    }

    await page.evaluate(() => window.scrollTo(0, 0));
    // Une capture pleine page ne peint pas les sections hors de la fenêtre
    // qui portent `content-visibility: auto` (elles restent blanches) ;
    // l'élève, lui, les voit en défilant. Pour la capture seulement.
    await page.addStyleTag({
        content: '.rendu-differe { content-visibility: visible !important; }',
    });
}

async function ouvrirAccueil(page: Page): Promise<void> {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible(ATTENTE);
    await parcourir(page);
    await expect(page.getByRole('button', { name: 'Vérifier' })).toBeVisible(
        ATTENTE,
    );
    await expect(
        page.getByRole('heading', { name: /tarifs à la portée/i }),
    ).toBeVisible(ATTENTE);
}

const ECRANS: { ecran: string; ouvrir: (page: Page) => Promise<void> }[] = [
    { ecran: 'vitrine-accueil', ouvrir: ouvrirAccueil },
    {
        ecran: 'question-jouee',
        ouvrir: async (page) => {
            await ouvrirAccueil(page);
            const essai = page.getByRole('region', { name: 'À vous de jouer' });
            await essai
                .getByRole('radio', { name: /^B\s+5\s000\sGNF$/ })
                .click();
            await essai.getByRole('button', { name: 'Vérifier' }).click();
            await expect(
                essai.getByText('Juste', { exact: false }).first(),
            ).toBeVisible(ATTENTE);
            await essai.scrollIntoViewIfNeeded();
        },
    },
    {
        ecran: 'annales-publiques',
        ouvrir: async (page) => {
            await page.goto('/sujets');
            await expect(
                page.getByRole('heading', { level: 1, name: /Les annales/ }),
            ).toBeVisible(ATTENTE);
        },
    },
    {
        ecran: 'sujet-public',
        ouvrir: async (page) => {
            await page.goto('/sujets/bepc-mathematiques-2024');
            await expect(
                page.getByRole('heading', {
                    level: 1,
                    name: /Sujet de Mathématiques/,
                }),
            ).toBeVisible(ATTENTE);
            await expect(
                page.getByRole('link', { name: 'Partager sur WhatsApp' }),
            ).toBeVisible();
        },
    },
];

for (const gabarit of GABARITS.filter((g) => g.nom !== '412')) {
    for (const theme of THEMES) {
        test.describe(`lot 8 · ${gabarit.nom} × ${theme.nom}`, () => {
            test.use({
                viewport: { width: gabarit.largeur, height: gabarit.hauteur },
                colorScheme: theme.schema,
            });

            test.beforeEach(async ({ page }) => {
                await page.clock.setFixedTime(HORLOGE);
            });

            for (const ecran of ECRANS) {
                test(`lot 8 — ${ecran.ecran}`, async ({ page }) => {
                    await ecran.ouvrir(page);
                    await page.waitForTimeout(300);
                    await capturer(
                        page,
                        'lot8',
                        ecran.ecran,
                        gabarit.nom,
                        theme.nom,
                    );
                });
            }
        });
    }
}

test("le lien d'une section depuis une page d'annales mène à la section", async ({
    page,
}) => {
    await page.goto('/sujets');
    await page
        .getByRole('navigation', { name: 'Sections' })
        .getByRole('link', { name: 'Tarifs' })
        .click();
    await expect(
        page.getByRole('heading', { name: /tarifs à la portée/i }),
    ).toBeInViewport(ATTENTE);
});

test("la question jouable ne met rien dans la file d'opérations", async ({
    page,
}) => {
    await ouvrirAccueil(page);
    const essai = page.getByRole('region', { name: 'À vous de jouer' });
    await essai.getByRole('radio').first().click();
    await essai.getByRole('button', { name: 'Vérifier' }).click();
    await expect(essai.getByText(/corrigé/i).first()).toBeVisible(ATTENTE);

    const enAttente = await page.evaluate(async () => {
        const base: IDBDatabase | null = await new Promise((resoudre) => {
            const ouverture = indexedDB.open('nkaramogo');
            ouverture.onsuccess = () => resoudre(ouverture.result);
            ouverture.onerror = () => resoudre(null);
        });

        if (!base || !base.objectStoreNames.contains('operations')) {
            return 0;
        }

        return new Promise<number>((resoudre) => {
            const compte = base
                .transaction('operations')
                .objectStore('operations')
                .count();
            compte.onsuccess = () => resoudre(compte.result);
        });
    });

    expect(enAttente).toBe(0);
});
