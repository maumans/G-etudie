import { execFileSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { SESSIONS, THEMES, capturer, figerHorloges } from './gabarits';

/**
 * Critère d'acceptation du lot 10 (PLAN § 12) : **une explication en flux
 * en moins de 3 s pour démarrer ; refus propre hors sujet.**
 *
 * Aïssatou (01) ouvre le sujet BEPC 2024 en lecture, « Voir le corrigé »,
 * puis « Explique-moi » : on mesure le temps entre l'appui et le premier
 * mot écrit dans la feuille (tuteur simulé, diffusé mot à mot comme
 * l'API). La réponse s'écrit en plusieurs fois avant d'être finie. Puis,
 * dans « Mon tuteur », une question sur le football : le tuteur recentre
 * avec la phrase de l'équipe, jamais le marqueur, et rien n'est décompté.
 *
 * Avec la vraie API, la mesure est à refaire après D11 (A_TESTER.md,
 * lot 10). Tourne après les captures ; ce qu'il crée est effacé.
 */
test.use({ storageState: SESSIONS.eleve });

const ATTENTE = { timeout: 30_000 };
const HORLOGE = new Date('2026-11-12T19:00:00Z');

const TAILLES = [
    { nom: '360', largeur: 360, hauteur: 740 },
    { nom: '768', largeur: 768, hauteur: 1024 },
    { nom: '1366', largeur: 1366, hauteur: 768 },
] as const;

function tinker(code: string): string {
    return execFileSync('php', ['artisan', 'tinker', '--execute', code])
        .toString()
        .trim();
}

// Ce que le parcours crée est effacé, par identifiant : une conversation
// sur une question d'exemple est elle-même marquée `est_exemple`.
let avant = { conversations: '0', explications: '0' };

test.beforeAll(() => {
    const [conversations, explications] = tinker(
        'echo (int) App\\Models\\ConversationTuteur::max("id"), " ", (int) App\\Models\\ExplicationTuteur::max("id");',
    ).split(' ');
    avant = { conversations, explications };
});

test.afterAll(() => {
    tinker(
        `App\\Models\\ConversationTuteur::where('id', '>', ${avant.conversations})->delete(); App\\Models\\ExplicationTuteur::where('id', '>', ${avant.explications})->delete();`,
    );
});

async function capturerPartout(page: Page, ecran: string): Promise<void> {
    for (const taille of TAILLES) {
        for (const theme of THEMES) {
            await page.setViewportSize({
                width: taille.largeur,
                height: taille.hauteur,
            });
            await page.emulateMedia({ colorScheme: theme.schema });
            await page.waitForTimeout(400);
            await capturer(page, 'lot10', ecran, taille.nom, theme.nom, {
                figerVariables: true,
            });
        }
    }
}

test('« Explique-moi » : le premier mot en moins de 3 s, puis la suite en flux', async ({
    page,
}) => {
    test.setTimeout(120_000);
    await figerHorloges(page, HORLOGE);
    await page.setViewportSize({ width: 412, height: 915 });

    await page.goto('/eleve/sujets');
    await page
        .getByRole('link', { name: /BEPC 2024/ })
        .first()
        .click();
    await page.getByRole('button', { name: 'Voir le corrigé' }).first().click();

    const feuille = page.getByRole('dialog', { name: /Ton tuteur t’explique/ });
    const reponse = feuille.locator('article').last();

    const depart = Date.now();
    const requete = page.waitForRequest('**/eleve/tuteur/demandes');
    const entetes = page.waitForResponse('**/eleve/tuteur/demandes');
    await page.getByRole('button', { name: 'Explique-moi' }).first().click();
    await requete;
    const envoi = Date.now() - depart;
    await entetes;
    const enTetes = Date.now() - depart;
    await expect(reponse.getByText(/EXEMPLE/)).toBeVisible(ATTENTE);
    const premierMot = Date.now() - depart;

    console.log(
        `Premier mot : ${premierMot} ms (requête partie à ${envoi} ms, en-têtes reçus à ${enTetes} ms)`,
    );
    expect(premierMot).toBeLessThan(3000);

    // En flux : l'explication grandit avant d'être finie.
    const longueurs: number[] = [];

    await expect
        .poll(
            async () => {
                longueurs.push(((await reponse.textContent()) ?? '').length);

                return reponse.getAttribute('aria-busy');
            },
            { timeout: 30_000, intervals: [100] },
        )
        .toBe('false');
    expect(new Set(longueurs).size).toBeGreaterThan(2);

    await expect(feuille.locator('.katex').first()).toBeVisible();
    await expect(
        feuille.getByRole('button', { name: 'Encore plus simple' }),
    ).toBeVisible();
    await expect(feuille.getByText(/Il te reste 1 explication/)).toBeVisible();
    await expect(
        feuille.getByRole('link', { name: /Retrouver cette conversation/ }),
    ).toBeVisible();

    await capturerPartout(page, 'feuille-explique-moi');
});

test('hors sujet : un recentrage propre, sans marqueur, rien de décompté', async ({
    page,
}) => {
    await figerHorloges(page, HORLOGE);
    await page.setViewportSize({ width: 412, height: 915 });

    await page.goto('/eleve/tuteur');
    await page
        .getByRole('textbox', { name: 'Ta question' })
        .fill('Qui va gagner le match de football ce soir ?');
    await page.getByRole('button', { name: 'Demander au tuteur' }).click();

    const fil = page.getByRole('list', { name: 'Conversation avec le tuteur' });
    await expect(
        fil.getByText(/Je suis là pour t’aider à réviser/),
    ).toBeVisible(ATTENTE);
    await expect(fil.getByText('recentre la discussion')).toBeVisible();
    await expect(page.getByText(/HORS_SUJET/)).toHaveCount(0);
    // Le recentrage ne coûte rien : le quota reste celui d'avant.
    await expect(page.getByText(/Il te reste 1 explication/)).toBeVisible();
    // Pas de relance sur un recentrage.
    await expect(
        page.getByRole('button', { name: 'Encore plus simple' }),
    ).toHaveCount(0);

    await capturerPartout(page, 'eleve-tuteur-recentrage');
});
