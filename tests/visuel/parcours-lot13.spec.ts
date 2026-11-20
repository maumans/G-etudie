import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { SESSIONS, figerHorloges } from './gabarits';

/**
 * Critère d'acceptation du lot 13 (PLAN § 12) : **rapport d'impact
 * exportable en PDF pour un partenaire.**
 *
 * Sékou (08) ouvre Console › Impact, choisit le BEPC sur 12 semaines, touche
 * « Télécharger le rapport (PDF) » : le fichier arrive, nommé, est un vrai
 * PDF ; l'export est inscrit au journal des accès (« Rapport d'impact
 * exporté »).
 *
 * Tourne après les captures (projet `parcours-impact`) : les exports
 * ajoutés au journal changeraient sinon « Mon compte › Sécurité » et le
 * journal capturés. Les entrées qu'il crée sont effacées à la fin.
 */
const ATTENTE = { timeout: 30_000 };
const HORLOGE = new Date('2026-11-20T12:45:00Z');

function tinker(code: string): string {
    return execFileSync('php', ['artisan', 'tinker', '--execute', code])
        .toString()
        .trim();
}

let depuis = '';

test.use({ storageState: SESSIONS.console });

test.beforeAll(() => {
    depuis = tinker('echo App\\Models\\EntreeJournalAcces::query()->max("id") ?? 0;');
});

test.afterAll(() => {
    tinker(
        `App\\Models\\EntreeJournalAcces::query()->where("id", ">", ${Number(depuis)})->where("action", "rapport_impact.exporte")->delete();`,
    );
});

test('lot 13 — le rapport d’impact se télécharge en PDF et l’export est journalisé', async ({ page }) => {
    await figerHorloges(page, HORLOGE);
    await page.goto('/console/impact');
    await expect(page.getByRole('heading', { level: 1, name: /impact/ })).toBeVisible(ATTENTE);

    await page.getByLabel('Examen').selectOption('BEPC');
    await expect(page).toHaveURL(/examen=BEPC/, ATTENTE);
    await expect(page.getByText(/BEPC · Tous les établissements/)).toBeVisible(ATTENTE);

    const [telechargement] = await Promise.all([
        page.waitForEvent('download'),
        page.getByRole('link', { name: /Télécharger le rapport/ }).click(),
    ]);
    expect(telechargement.suggestedFilename()).toMatch(/^rapport-impact-nkaramogo-\d{4}-\d{2}-\d{2}\.pdf$/);
    const contenu = readFileSync(await telechargement.path());
    expect(contenu.subarray(0, 5).toString()).toBe('%PDF-');
    expect(contenu.length).toBeGreaterThan(10_000);

    await page.goto('/console/journal?action=rapport_impact.exporte');
    await expect(page.getByRole('listitem').filter({ hasText: /Rapport d.impact exporté/ }).first()).toBeVisible(ATTENTE);
});
