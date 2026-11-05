/**
 * Rendu du dossier : dossier.html → N-karamogo-dossier-ministere.pdf, et une
 * image par page (apercus/) pour la relecture.
 *   node docs/presentation-ministere/rendre.mjs
 */
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const ici = dirname(fileURLToPath(import.meta.url));
const navigateur = await chromium.launch();
const page = await navigateur.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 1.5 });
await page.goto(pathToFileURL(resolve(ici, 'dossier.html')).href);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(500);
await page.pdf({ path: resolve(ici, 'N-karamogo-dossier-ministere.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true });

mkdirSync(resolve(ici, 'apercus'), { recursive: true });
const pages = await page.locator('section.page').all();
for (const [rang, section] of pages.entries()) {
    await section.screenshot({ path: resolve(ici, `apercus/page-${String(rang + 1).padStart(2, '0')}.png`) });
}
console.log(`${pages.length} pages`);
await navigateur.close();
