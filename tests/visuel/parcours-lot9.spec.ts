import { execFileSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { SESSIONS, capturer, figerHorloges } from './gabarits';

/**
 * Critère d'acceptation du lot 9 (PLAN § 12) : un paiement de test de bout
 * en bout, et un webhook rejoué deux fois n'ouvre qu'un abonnement.
 *
 * Ousmane (09) choisit l'année, paie par Orange Money, l'opérateur simulé
 * valide — le webhook signé part du navigateur vers la vraie route —, puis
 * on revient sur l'écran de l'opérateur et on revalide deux fois. L'écran
 * dit « Paiement reçu » ; en base, un seul abonnement pour ce paiement, et
 * la date de fin est celle annoncée avant de payer.
 *
 * Tourne après les captures ; le paiement et son abonnement sont effacés.
 */
test.use({
    viewport: { width: 412, height: 915 },
    storageState: SESSIONS.ousmane,
});

const ATTENTE = { timeout: 30_000 };

let paiement: string | null = null;

function tinker(code: string): string {
    return execFileSync('php', ['artisan', 'tinker', '--execute', code])
        .toString()
        .trim();
}

test.afterAll(() => {
    if (paiement === null) {
        return;
    }

    tinker(
        `$p = App\\Models\\Paiement::where('uuid', '${paiement}')->first(); if ($p) { App\\Models\\Abonnement::where('paiement_id', $p->id)->delete(); App\\Models\\NotificationPaiement::where('paiement_id', $p->id)->delete(); $p->delete(); }`,
    );
});

test('paiement de bout en bout, webhook rejoué : un seul abonnement', async ({
    page,
}) => {
    test.setTimeout(120_000);
    // Les deux horloges figées (CLAUDE.md § 4) : les dates des captures ne
    // bougent pas d'un jour à l'autre.
    await figerHorloges(page, new Date('2026-11-05T10:00:00Z'));

    await page.goto('/eleve/abonnement/payer/annee');
    const resume = page.locator('dl').filter({ hasText: 'Abonné jusqu’au' });
    const finAnnoncee = (
        await resume.locator('dd').nth(1).textContent()
    )?.trim();
    expect(finAnnoncee).toBeTruthy();

    await page.getByText('Orange Money', { exact: true }).click();
    await page.getByLabel('Numéro qui paie').fill('622123456');
    await page.getByRole('button', { name: /^Payer 100/ }).click();

    await expect(
        page.getByRole('heading', { name: /Paiement en attente/ }),
    ).toBeVisible(ATTENTE);
    paiement = page.url().split('/').pop() ?? null;
    await capturer(page, 'lot9', 'paiement-en-attente', '412', 'clair', {
        figerVariables: true,
    });

    // L'opérateur simulé : « Valider » envoie le webhook signé.
    await page
        .getByRole('link', { name: /Ouvrir l’écran de l’opérateur/ })
        .click();
    const operateur = page.url();
    await page.getByRole('button', { name: 'Valider' }).click();
    await expect(
        page.getByRole('heading', { name: /Paiement reçu/ }),
    ).toBeVisible(ATTENTE);
    await expect(page.getByText(`Jusqu’au ${finAnnoncee}`)).toBeVisible();
    await capturer(page, 'lot9', 'paiement-recu', '412', 'clair', {
        figerVariables: true,
    });

    // Rejoué deux fois : même événement, rien ne change.
    for (let fois = 0; fois < 2; fois++) {
        await page.goto(operateur);
        await expect(page.getByText(/déjà conclu/)).toBeVisible(ATTENTE);
        await page.getByRole('button', { name: 'Valider' }).click();
        await expect(
            page.getByRole('heading', { name: /Paiement reçu/ }),
        ).toBeVisible(ATTENTE);
    }

    const bilan = tinker(
        `$p = App\\Models\\Paiement::where('uuid', '${paiement}')->sole(); echo App\\Models\\Abonnement::where('paiement_id', $p->id)->count().'|'.App\\Models\\NotificationPaiement::where('paiement_id', $p->id)->count().'|'.$p->statut->value;`,
    );
    const [abonnements, notifications] = bilan.split('|');

    expect(abonnements).toBe('1');
    // La première copie d'un événement est gardée ; les deux rejouées
    // s'arrêtent à l'unicité de l'identifiant d'événement.
    expect(notifications).toBe('1');
    expect(bilan.endsWith('|reussi')).toBe(true);

    await page.goto('/eleve/abonnement');
    await expect(page.getByText(`Jusqu’au ${finAnnoncee}`)).toBeVisible(
        ATTENTE,
    );
});
