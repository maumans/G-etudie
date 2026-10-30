import { execFileSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { SESSIONS } from './gabarits';

/**
 * Critère d'acceptation du lot 1 (PLAN § 12), par les vrais écrans : un
 * rédacteur crée une leçon avec une formule et l'envoie ; l'auteur ne peut
 * pas la relire ; un autre compte la relit et la publie.
 *
 * Tourne après les captures (projet `parcours-contenu`) : ses compteurs ne
 * les perturbent pas. La leçon créée est effacée à la fin (base de
 * développement propre, captures stables au passage suivant).
 */
test.use({ viewport: { width: 1366, height: 768 } });

let uuid: string | null = null;

test.afterAll(() => {
    if (uuid === null) {
        return;
    }

    // Aucun écran n'efface une leçon (on archive) : nettoyage du test seulement.
    execFileSync('php', [
        'artisan',
        'tinker',
        '--execute',
        `$l = App\\Models\\Lecon::where('uuid', '${uuid}')->first(); if ($l) { $l->forceFill(['version_publiee_id' => null])->save(); $l->versions()->delete(); $l->delete(); }`,
    ]);
});

test('un rédacteur écrit une leçon avec une formule, un autre la relit et la publie', async ({
    browser,
}) => {
    const titre = `Parcours ${Date.now()}`;

    // — Le rédacteur crée la leçon et l'écrit.
    const redaction = await browser.newContext({
        storageState: SESSIONS.contenu,
    });
    const redacteur = await redaction.newPage();

    await redacteur.goto('/contenu/lecons/creer');
    await redacteur
        .getByLabel('Notion')
        .selectOption({ label: "Le cosinus d'un angle aigu" });
    await redacteur.getByLabel('Titre').fill(titre);
    await redacteur.getByRole('button', { name: 'Ouvrir l’éditeur' }).click();

    const editeur = redacteur.getByRole('textbox', {
        name: 'Contenu de la leçon',
    });
    await expect(editeur).toBeVisible();
    uuid =
        redacteur.url().match(/lecons\/([0-9a-f-]{36})\/edition/)?.[1] ?? null;
    expect(uuid).not.toBeNull();

    await editeur.click();
    await editeur.pressSequentially('Dans un triangle rectangle, ');
    await redacteur
        .getByRole('button', { name: 'Formule dans la ligne' })
        .click();
    const dialogue = redacteur.getByRole('dialog');
    await dialogue
        .getByLabel('Code LaTeX')
        .fill('\\cos \\widehat{B} = \\frac{AB}{BC}');
    // Le rendu en direct (les raccourcis sont aussi des formules).
    await expect(dialogue.locator('[aria-live="polite"] math')).toHaveCount(1);
    await dialogue.getByRole('button', { name: 'Insérer' }).click();

    // L'aperçu « comme l'élève la verra » montre la formule.
    await expect(
        redacteur
            .getByRole('region', { name: 'Comme l’élève la verra' })
            .locator('math'),
    ).toHaveCount(1);
    await expect(redacteur.getByRole('status')).toContainText('Enregistré', {
        timeout: 15_000,
    });

    // — Il l'envoie en relecture.
    await redacteur
        .getByRole('button', { name: 'Envoyer en relecture' })
        .click();
    await redacteur
        .getByRole('alertdialog')
        .getByRole('button', { name: 'Envoyer en relecture' })
        .click();
    await expect(
        redacteur.getByText('En attente d’un relecteur'),
    ).toBeVisible();

    // L'auteur ne peut pas se relire : pas de bouton, et la route refuse.
    await expect(
        redacteur.getByRole('button', { name: 'Publier' }),
    ).toHaveCount(0);
    const refus = await redacteur.request.post(
        `/contenu/lecons/${uuid}/publier`,
        {
            headers: { 'X-XSRF-TOKEN': await jeton(redaction) },
        },
    );
    expect(refus.status()).toBe(403);

    // — Un autre compte la relit et la publie.
    const relecture = await browser.newContext({
        storageState: SESSIONS.pedagogie,
    });
    const relecteur = await relecture.newPage();

    await relecteur.goto('/contenu/relecture');
    await relecteur.getByRole('link', { name: titre }).click();
    await expect(
        relecteur.getByRole('heading', { name: 'À vous de relire' }),
    ).toBeVisible();
    await expect(relecteur.locator('article math')).toHaveCount(1);
    await relecteur
        .getByLabel('Commentaire pour l’auteur')
        .fill('Juste et clair.');
    await relecteur.getByRole('button', { name: 'Publier' }).click();
    await relecteur
        .getByRole('alertdialog')
        .getByRole('button', { name: 'Publier' })
        .click();

    await expect(
        relecteur.getByText('En ligne', { exact: true }).first(),
    ).toBeVisible();
    await expect(relecteur.getByText('Juste et clair.')).toBeVisible();

    // L'auteur retrouve sa leçon publiée.
    await redacteur.reload();
    await expect(
        redacteur.getByText('Publiée', { exact: true }).first(),
    ).toBeVisible();

    await redaction.close();
    await relecture.close();
});

/** Jeton CSRF de la session (cookie XSRF-TOKEN), pour un POST hors formulaire. */
async function jeton(
    contexte: import('@playwright/test').BrowserContext,
): Promise<string> {
    const cookie = (await contexte.cookies()).find(
        (c) => c.name === 'XSRF-TOKEN',
    );

    return decodeURIComponent(cookie?.value ?? '');
}
