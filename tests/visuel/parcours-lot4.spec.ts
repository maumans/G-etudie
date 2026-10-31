import { execFileSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { SESSIONS } from './gabarits';

/**
 * Critère d'acceptation du lot 4 (PLAN § 12), par les vrais écrans : un
 * sujet scanné devient une annale structurée publiable **sans saisie
 * manuelle de l'énoncé**. Le rédacteur téléverse le PDF ; la lecture tourne
 * en file (ici `queue:work --once`, extracteur simulé sans clé d'API) ; il
 * vérifie les réponses proposées et envoie l'annale ; le responsable
 * pédagogique la publie ; l'élève de BEPC la trouve et s'y entraîne.
 *
 * Tourne après les captures ; l'annale créée est effacée à la fin.
 */
test.use({ viewport: { width: 1366, height: 768 } });

const ATTENTE = { timeout: 30_000 };

/** Une session qu'aucune annale de démonstration n'occupe. */
const SESSION = '2015';

/** Un PDF minimal : il suffit qu'il soit reconnu comme PDF. */
const PDF = Buffer.from(
    '%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n',
);

test.afterAll(() => {
    // Aucun écran n'efface une annale (on archive) : nettoyage du test seulement.
    execFileSync('php', [
        'artisan',
        'tinker',
        '--execute',
        `foreach (App\\Models\\Sujet::where('session', ${SESSION})->get() as $s) { $q = App\\Models\\Question::whereIn('sujet_partie_id', $s->parties()->select('id'))->get(); App\\Models\\Tentative::whereIn('question_id', $q->pluck('id'))->delete(); foreach ($q as $x) { $x->forceFill(['version_publiee_id' => null])->save(); $x->versions()->delete(); $x->delete(); } App\\Models\\ImportSujet::where('sujet_id', $s->id)->delete(); $s->forceFill(['version_publiee_id' => null])->save(); $s->versions()->delete(); $s->parties()->delete(); $s->delete(); }`,
    ]);
});

test('un sujet scanné devient une annale publiée, que l’élève travaille', async ({
    browser,
}) => {
    // Trois comptes, une lecture en file : plus long qu'une capture.
    test.setTimeout(180_000);

    // — Le rédacteur téléverse le sujet.
    const redaction = await browser.newContext({
        storageState: SESSIONS.contenu,
    });
    const redacteur = await redaction.newPage();
    await redacteur.goto('/contenu/annales/importer');
    await redacteur.getByLabel('Le document').setInputFiles({
        name: `bepc-${SESSION}.pdf`,
        mimeType: 'application/pdf',
        buffer: PDF,
    });
    await redacteur
        .getByLabel('Examen', { exact: true })
        .selectOption({ label: "Brevet d'études du premier cycle" });
    await redacteur
        .getByLabel('Matière', { exact: true })
        .selectOption({ label: 'Mathématiques' });
    await redacteur.getByLabel('Session', { exact: true }).fill(SESSION);
    await redacteur.getByRole('button', { name: 'Lancer la lecture' }).click();
    await expect(redacteur).toHaveURL(/\/contenu\/annales$/, ATTENTE);
    await expect(
        redacteur.getByText(`Mathématiques · BEPC ${SESSION}`).first(),
    ).toBeVisible(ATTENTE);

    // — La file lit le document (le travailleur de production le fait seul).
    execFileSync('php', [
        'artisan',
        'queue:work',
        '--once',
        '--stop-when-empty',
    ]);

    // La page se rafraîchit seule pendant la lecture ; on recharge pour ne
    // pas attendre le prochain passage.
    await redacteur.reload();
    const ligne = redacteur
        .getByRole('listitem')
        .filter({ hasText: `BEPC ${SESSION}` })
        .first();
    await ligne.getByRole('link', { name: 'Vérifier l’annale' }).click();
    await expect(
        redacteur.getByRole('heading', {
            level: 1,
            name: new RegExp(`BEPC ${SESSION}`),
        }),
    ).toBeVisible(ATTENTE);

    // L'énoncé est déjà là : rien à ressaisir, seulement vérifier.
    await expect(redacteur.getByText('Calcule').first()).toBeVisible();
    const verifier = redacteur.getByRole('button', { name: 'J’ai vérifié' });
    const nombre = await verifier.count();
    expect(nombre).toBeGreaterThan(0);

    for (let reste = nombre; reste > 0; reste--) {
        await verifier.first().click();
        await expect(verifier).toHaveCount(reste - 1, ATTENTE);
    }

    await redacteur
        .getByRole('button', { name: 'Envoyer en relecture' })
        .click();
    await redacteur
        .getByRole('alertdialog')
        .getByRole('button', { name: 'Envoyer en relecture' })
        .click();
    await expect(redacteur.getByText('En attente d’un relecteur')).toBeVisible(
        ATTENTE,
    );
    await redaction.close();

    // — Le responsable pédagogique publie l'annale et ses questions.
    const relecture = await browser.newContext({
        storageState: SESSIONS.pedagogie,
    });
    const relecteur = await relecture.newPage();
    await relecteur.goto('/contenu/relecture/annales');
    await relecteur
        .getByRole('link', { name: new RegExp(`BEPC ${SESSION}`) })
        .click();
    await relecteur.getByRole('button', { name: 'Publier l’annale' }).click();
    await relecteur
        .getByRole('alertdialog')
        .getByRole('button', { name: 'Publier' })
        .click();
    await expect(relecteur.getByText('En ligne').first()).toBeVisible(ATTENTE);
    await relecture.close();

    // — L'élève de BEPC la trouve, la lit et s'y entraîne.
    const eleve = await browser.newContext({ storageState: SESSIONS.eleve });
    const page = await eleve.newPage();
    await page.goto('/eleve/annales');
    await page
        .getByRole('link', { name: new RegExp(`BEPC ${SESSION}`) })
        .click();
    await expect(
        page.getByRole('heading', {
            level: 1,
            name: new RegExp(`BEPC ${SESSION}`),
        }),
    ).toBeVisible(ATTENTE);
    await page.getByRole('tab', { name: /Entraînement/ }).click();
    await expect(page.getByText(/^Question\s*1\s*sur/)).toBeVisible(ATTENTE);
    await eleve.close();
});
