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
 * Écrans du lot 7 (hors ligne complet), sur les données de démonstration
 * (Aïssatou, 01, BEPC) :
 *
 * - « Téléchargements » après le téléchargement des Mathématiques (les
 *   autres matières disent que la place gratuite est prise) ;
 * - la page d'une matière (pack sur le téléphone, annales) ;
 * - « Qui révise ? » (profil à garder avec un code) ;
 * - « Mon compte › Appareils » (les dix plus récents, les autres comptés) ;
 * - la connexion avec deux profils déjà gardés sur le téléphone.
 */

const ATTENTE = { timeout: 30_000 };

/** Un jeudi matin à Conakry (UTC+0). */
const HORLOGE = new Date('2026-11-05T10:00:00Z');

type Ecran = { ecran: string; ouvrir: (page: Page) => Promise<void> };

async function telechargerMaths(page: Page): Promise<void> {
    await page.goto('/eleve/telechargements');
    const ligne = page
        .getByRole('listitem')
        .filter({ hasText: 'Mathématiques' });
    const telecharger = ligne.getByRole('button', { name: 'Télécharger' });

    if (await telecharger.isVisible()) {
        await telecharger.click();
    }

    await expect(ligne.getByText('Sur le téléphone')).toBeVisible(ATTENTE);
    await page.reload();
    await expect(ligne.getByText('Sur le téléphone')).toBeVisible(ATTENTE);
}

/**
 * « Appareils » : chaque passage des captures enregistre un appareil pour
 * le compte de démonstration ; l'écran montre les dix plus récents (même
 * libellé, dates masquées) et compte les autres (masqué).
 */
async function ouvrirAppareils(page: Page): Promise<void> {
    await page.goto('/compte/appareils');
    await expect(
        page.getByRole('heading', { name: /Où ton compte est gardé/ }),
    ).toBeVisible(ATTENTE);
}

const ECRANS: Ecran[] = [
    {
        ecran: 'telechargements',
        ouvrir: telechargerMaths,
    },
    {
        ecran: 'matiere-pack',
        ouvrir: async (page) => {
            await telechargerMaths(page);
            await page.goto('/eleve/cours/maths');
            await expect(page.getByText(/est sur ce téléphone/)).toBeVisible(
                ATTENTE,
            );
        },
    },
    {
        ecran: 'qui-revise',
        ouvrir: async (page) => {
            await page.goto('/eleve/cours');
            await expect(page.getByRole('heading', { level: 1 })).toBeVisible(
                ATTENTE,
            );
            await page
                .getByRole('button', { name: /Qui révise/ })
                .first()
                .click();
            await expect(
                page.getByRole('button', { name: /Garde ton profil ici/ }),
            ).toBeVisible(ATTENTE);
        },
    },
    {
        ecran: 'appareils',
        ouvrir: ouvrirAppareils,
    },
];

for (const gabarit of GABARITS.filter((g) => g.nom !== '412')) {
    for (const theme of THEMES) {
        test.describe(`lot 7 · ${gabarit.nom} × ${theme.nom}`, () => {
            test.use({
                viewport: { width: gabarit.largeur, height: gabarit.hauteur },
                colorScheme: theme.schema,
            });

            test.beforeEach(async ({ page }) => {
                await figerHorloges(page, HORLOGE);
            });

            test.describe('connecté (élève)', () => {
                test.use({ storageState: SESSIONS.eleve });

                for (const ecran of ECRANS) {
                    test(`lot 7 — ${ecran.ecran}`, async ({ page }) => {
                        await ecran.ouvrir(page);
                        await page.waitForTimeout(300);
                        await capturer(
                            page,
                            'lot7',
                            ecran.ecran,
                            gabarit.nom,
                            theme.nom,
                            { figerVariables: true },
                        );
                    });
                }
            });

            test('lot 7 — connexion avec les profils du téléphone', async ({
                page,
            }) => {
                await page.goto('/login');
                await expect(
                    page.getByRole('button', { name: 'Se connecter' }),
                ).toBeVisible(ATTENTE);
                // Deux profils gardés sur ce téléphone (code et jeton posés).
                await page.evaluate(async () => {
                    const ouverture = indexedDB.open('nkaramogo');
                    const base: IDBDatabase = await new Promise(
                        (resoudre) =>
                            (ouverture.onsuccess = () =>
                                resoudre(ouverture.result)),
                    );
                    const profils = base
                        .transaction('profils', 'readwrite')
                        .objectStore('profils');
                    const code = { sel: 'x', empreinte: 'y', iterations: 1 };

                    for (const [id, prenom, pseudo, ajoute] of [
                        [901, 'Mariama', 'mariama_k', '2026-11-01'],
                        [902, 'Sékou', 'sekou_k', '2026-11-02'],
                    ] as const) {
                        profils.put({
                            id,
                            prenom,
                            pseudo,
                            jeton: 'j',
                            code,
                            essais: 0,
                            bloque_jusqu: null,
                            ajoute_le: ajoute,
                            vu_le: ajoute,
                        });
                    }

                    await new Promise(
                        (resoudre) =>
                            (profils.transaction.oncomplete = resoudre),
                    );
                });
                await page.reload();
                await expect(
                    page.getByText('Déjà sur ce téléphone'),
                ).toBeVisible(ATTENTE);
                await capturer(
                    page,
                    'lot7',
                    'connexion-profils',
                    gabarit.nom,
                    theme.nom,
                );
            });
        });
    }
}
