import { execFileSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { SESSIONS } from './gabarits';

/**
 * Critère d'acceptation du lot 5 (PLAN § 12 ; HORS_LIGNE.md A.8) : une
 * coupure en plein examen blanc — **l'onglet fermé** — ne fait rien perdre.
 * Aïssatou commence l'examen sur une annale, répond, ferme l'onglet ; en
 * rouvrant l'application, l'accueil annonce l'examen en cours et le
 * rouvre à la bonne question, réponse gardée ; elle termine ; la note part
 * par la file et le serveur la reçoit **une seule fois**.
 *
 * Tourne après les captures ; l'examen créé est effacé à la fin.
 */
test.use({
    viewport: { width: 412, height: 915 },
    storageState: SESSIONS.eleve,
});

const ATTENTE = { timeout: 30_000 };

let uuid: string | null = null;

function tinker(code: string): string {
    return execFileSync('php', [
        'artisan',
        'tinker',
        '--execute',
        code,
    ]).toString();
}

test.afterAll(() => {
    if (uuid === null) {
        return;
    }

    tinker(
        `$e = App\\Models\\ExamenBlanc::where('uuid', '${uuid}')->first(); if ($e) { App\\Models\\Tentative::where('user_id', $e->user_id)->where('mode', 'examen_blanc')->where('recu_le', '>=', $e->recu_le)->delete(); $e->delete(); }`,
    );
});

test('onglet fermé en plein examen : repris à la bonne question, une seule note reçue', async ({
    context,
}) => {
    test.setTimeout(180_000);

    const page = await context.newPage();
    await page.goto('/eleve/annales');
    await page
        .getByRole('link', { name: /BEPC 2023/ })
        .first()
        .click();
    await page.getByRole('tab', { name: /Conditions réelles|Examen/ }).click();
    await page.getByRole('button', { name: /^Commencer l’examen/ }).click();

    const examen = page.getByRole('dialog', { name: /Examen blanc/ });
    await expect(examen).toBeVisible(ATTENTE);
    await examen.getByRole('textbox').first().fill('4');
    await examen.getByRole('button', { name: 'Question suivante' }).click();
    await expect(examen.getByText('Question 2', { exact: true })).toBeVisible();

    uuid = await page.evaluate(async () => {
        const ouverture = indexedDB.open('nkaramogo');
        const base = await new Promise<IDBDatabase>((resoudre) => {
            ouverture.onsuccess = () => resoudre(ouverture.result);
        });
        const lignes = await new Promise<{ id: string }[]>((resoudre) => {
            const requete = base
                .transaction('examens_blancs')
                .objectStore('examens_blancs')
                .getAll();
            requete.onsuccess = () => resoudre(requete.result);
        });

        return lignes[0]?.id ?? null;
    });
    expect(uuid).not.toBeNull();

    // — Coupure : l'onglet est fermé en plein examen.
    await page.close();

    // — L'application rouverte : l'accueil annonce l'examen en cours.
    const reprise = await context.newPage();
    await reprise.goto('/eleve');
    await reprise.getByRole('link', { name: /Examen blanc en cours/ }).click();

    const repris = reprise.getByRole('dialog', { name: /Examen blanc/ });
    await expect(repris).toBeVisible(ATTENTE);
    // À la bonne question, la réponse d'avant gardée.
    await expect(repris.getByText('Question 2', { exact: true })).toBeVisible();
    await expect(repris.getByText('1 / 3 répondues')).toBeVisible();

    await repris.getByRole('button', { name: /^Question 1/ }).click();
    await expect(repris.getByRole('textbox').first()).toHaveValue('4');

    await repris.getByRole('button', { name: 'Terminer l’examen' }).click();
    await reprise
        .getByRole('alertdialog')
        .getByRole('button', { name: 'Terminer' })
        .click();

    // — La note s'affiche, puis le serveur la reçoit.
    await expect(reprise.getByText('/20').first()).toBeVisible(ATTENTE);
    await expect(reprise.getByText('Note reçue par N’karamögö.')).toBeVisible(
        ATTENTE,
    );

    // Une seule note au serveur, recorrigée : 4 est juste (1 question sur 3).
    const recu = tinker(
        `$e = App\\Models\\ExamenBlanc::where('uuid', '${uuid}')->get(); echo $e->count().'|'.$e->first()?->note_sur_20;`,
    ).trim();
    expect(recu).toBe('1|6.67');

    await reprise
        .getByRole('link', { name: 'Voir le détail et le corrigé' })
        .click();
    await expect(
        reprise.getByRole('heading', { name: 'Partie par partie' }),
    ).toBeVisible(ATTENTE);
});
