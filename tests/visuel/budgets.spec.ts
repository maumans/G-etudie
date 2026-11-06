import { gzipSync } from 'node:zlib';
import { expect, test } from '@playwright/test';
import type { Page, Response } from '@playwright/test';
import { SESSIONS, repondreAuHasard } from './gabarits';

/**
 * HORS_LIGNE.md A.11 et A.14 n° 25 (lot 7, HL7) : les budgets de poids,
 * mesurés sur l'application construite, en « 3G lente » et processeur
 * ralenti ×4 (CDP). `php artisan serve` ne compresse pas : chaque réponse
 * est compressée ici (gzip, niveau 6, comme le serveur web de production)
 * pour compter ce que l'élève paie vraiment.
 *
 * - coquille de l'espace élève, premier chargement, hors polices : < 500 Ko
 *   (le précache du service worker se fait ensuite, en arrière-plan : il
 *   est mesuré à part, et affiché) ;
 * - une tentative dans la file : < 2 Ko ;
 * - un lot de 50 tentatives : < 40 Ko compressé ;
 * - le battement : ≤ 1 Ko.
 *
 * La mise à jour d'un pack après la correction d'un corrigé (< 20 Ko) est
 * mesurée par PackDifferentielTest (Pest), sur le vrai différentiel.
 */

const KO = 1024;

async function ralentir(page: Page): Promise<void> {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Network.enable');
    // « Slow 3G » de Chrome : 400 ms, 400 kbit/s descendant, 400 kbit/s montant.
    await cdp.send('Network.emulateNetworkConditions', {
        offline: false,
        latency: 400,
        downloadThroughput: (400 * 1000) / 8,
        uploadThroughput: (400 * 1000) / 8,
    });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
}

async function tailleCompressee(reponse: Response): Promise<number> {
    try {
        return gzipSync(await reponse.body(), { level: 6 }).length;
    } catch {
        return 0;
    }
}

test.describe('budgets (A.11)', () => {
    test.use({ storageState: SESSIONS.eleve, serviceWorkers: 'block' });

    test('coquille de l’espace élève : premier chargement < 500 Ko compressés, hors polices', async ({
        page,
    }) => {
        test.setTimeout(180_000);
        await ralentir(page);
        const reponses: Response[] = [];
        page.on('response', (reponse) => reponses.push(reponse));

        await page.goto('/eleve', {
            waitUntil: 'networkidle',
            timeout: 150_000,
        });
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

        let total = 0;
        let polices = 0;
        const detail: string[] = [];

        for (const reponse of reponses) {
            const taille = await tailleCompressee(reponse);
            const url = new URL(reponse.url());

            if (/\.(woff2?|ttf)$/.test(url.pathname)) {
                polices += taille;
                continue;
            }

            total += taille;
            detail.push(`${Math.round(taille / KO)} Ko ${url.pathname}`);
        }

        test.info().annotations.push({
            type: 'mesure',
            description: `coquille ${Math.round(total / KO)} Ko (+ polices ${Math.round(polices / KO)} Ko) : ${detail.join(' · ')}`,
        });
        console.log(
            `[budget] coquille : ${Math.round(total / KO)} Ko compressés, polices ${Math.round(polices / KO)} Ko`,
        );
        expect(total).toBeLessThan(500 * KO);
    });

    test('battement ≤ 1 Ko', async ({ page }) => {
        await page.goto('/eleve');
        const reponse = await page.request.get('/sync/etat', {
            headers: { Accept: 'application/json' },
        });
        const corps = await reponse.body();

        console.log(`[budget] battement : ${corps.length} octets`);
        expect(reponse.ok()).toBe(true);
        expect(corps.length).toBeLessThanOrEqual(KO);
    });
});

test('une tentative < 2 Ko ; un lot de 50 tentatives < 40 Ko compressé', async ({
    page,
}) => {
    test.setTimeout(180_000);
    const corps: string[] = [];
    page.on('request', (requete) => {
        if (
            requete.url().endsWith('/sync/operations') &&
            requete.method() === 'POST'
        ) {
            corps.push(requete.postData() ?? '');
        }
    });

    // Un élève neuf, sa première question, comme dans la vraie vie.
    const fin = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
    await page.goto('/register');
    await page.getByLabel('Prénom').fill('Binta');
    await page.getByLabel('Pseudo').fill(`budget_${fin}`);
    await page.getByLabel('Numéro de téléphone').fill(`603${fin}`);
    await page
        .getByLabel('Mot de passe', { exact: true })
        .fill('parcours-2027');
    await page.getByRole('button', { name: 'Créer mon compte' }).click();
    await page
        .getByRole('link', { name: 'Plus tard' })
        .click({ timeout: 30_000 });
    await page.getByRole('radio', { name: /^BEPC/ }).click();
    await page.getByRole('button', { name: 'Continuer' }).click();
    await page.getByRole('radio', { name: /10 min/ }).click();
    await page
        .getByRole('button', { name: 'Faire mon premier exercice' })
        .click();
    await expect(page).toHaveURL(/\/eleve\/seances\//, { timeout: 30_000 });

    await repondreAuHasard(page);
    await expect
        .poll(() => corps.length, { timeout: 30_000 })
        .toBeGreaterThan(0);

    const lot = JSON.parse(corps[0]) as {
        operations: Record<string, unknown>[];
    };
    const une = lot.operations[0];
    const taille = Buffer.byteLength(JSON.stringify(une));

    // Cinquante gestes du même genre, chacun avec son uuid.
    const cinquante = {
        ...lot,
        operations: Array.from({ length: 50 }, (_, rang) => ({
            ...une,
            uuid: `${String(une.uuid).slice(0, -4)}${String(rang).padStart(4, '0')}`,
        })),
    };
    const compresse = gzipSync(Buffer.from(JSON.stringify(cinquante)), {
        level: 6,
    }).length;

    console.log(
        `[budget] tentative : ${taille} octets ; lot de 50 : ${Math.round(compresse / KO)} Ko compressés`,
    );
    expect(une.type).toBe('tentative.enregistrer');
    expect(taille).toBeLessThan(2 * KO);
    expect(compresse).toBeLessThan(40 * KO);
});
