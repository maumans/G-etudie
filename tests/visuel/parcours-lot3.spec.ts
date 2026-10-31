import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { THEMES, capturer, repondreAuHasard } from './gabarits';

/**
 * HORS_LIGNE.md A.14 n° 24 (lot 3, HL2) : **mode avion, séance complète,
 * rechargement, retour du réseau → un seul envoi**. Par les vrais écrans,
 * sur un élève neuf (BEPC, 30 minutes : une séance de quinze questions de
 * tous les types), supprimé à la fin.
 *
 * L'ardoise des nouveaux types est capturée en chemin (3 tailles × 2
 * thèmes) : remise en ordre, texte à trous, question ouverte à
 * auto-évaluer.
 */

const ATTENTE = { timeout: 20_000 };

/** Un jeudi soir à Conakry (UTC+0). */
const HORLOGE = new Date('2026-10-29T19:00:00Z');

const TAILLES = [
    { nom: '360', largeur: 360, hauteur: 740 },
    { nom: '768', largeur: 768, hauteur: 1024 },
    { nom: '1366', largeur: 1366, hauteur: 768 },
] as const;

async function capturerPartout(page: Page, ecran: string): Promise<void> {
    for (const taille of TAILLES) {
        for (const theme of THEMES) {
            await page.setViewportSize({
                width: taille.largeur,
                height: taille.hauteur,
            });
            await page.emulateMedia({ colorScheme: theme.schema });
            await page.waitForTimeout(400);
            await capturer(page, 'lot3', ecran, taille.nom, theme.nom, {
                figerVariables: true,
            });
        }
    }

    await page.setViewportSize({ width: 360, height: 740 });
    await page.emulateMedia({ colorScheme: 'light' });
}

/** L'ardoise montre-t-elle une question de ce genre ? */
async function genre(
    page: Page,
): Promise<'ordre' | 'trous' | 'ouverte' | null> {
    const principal = page.getByRole('main');

    if (
        (await principal.getByRole('list', { name: 'Ordre proposé' }).count()) >
        0
    ) {
        return 'ordre';
    }

    if ((await principal.getByLabel('Trou 1').count()) > 0) {
        return 'trous';
    }

    if ((await principal.getByLabel('Ta rédaction').count()) > 0) {
        return 'ouverte';
    }

    return null;
}

test('mode avion : séance complète, rechargement, retour du réseau → un seul envoi', async ({
    page,
    context,
}) => {
    test.setTimeout(600_000);
    await page.clock.setFixedTime(HORLOGE);
    await page.setViewportSize({ width: 360, height: 740 });

    // Ce que l'appareil tente d'envoyer (hors ligne, la requête échoue), et
    // ce que le serveur répond, geste par geste.
    const envois: { uuid: string; type: string }[] = [];
    const verdicts: { uuid: string; verdict: string }[] = [];
    page.on('request', (requete) => {
        if (
            requete.url().endsWith('/sync/operations') &&
            requete.method() === 'POST'
        ) {
            const corps = requete.postDataJSON() as {
                operations: { uuid: string; type: string }[];
            };
            envois.push(
                ...corps.operations.map((o) => ({
                    uuid: o.uuid,
                    type: o.type,
                })),
            );
        }
    });
    page.on('response', async (reponse) => {
        if (reponse.url().endsWith('/sync/operations') && reponse.ok()) {
            const corps = (await reponse.json()) as {
                resultats: { uuid: string; verdict: string }[];
            };
            verdicts.push(...corps.resultats);
        }
    });

    const suffixe = String(Math.floor(Math.random() * 1_000_000)).padStart(
        6,
        '0',
    );
    const motDePasse = 'parcours-2027';

    await page.goto('/register');
    await page.getByLabel('Prénom').fill('Fanta');
    await page.getByLabel('Pseudo').fill(`avion_${suffixe}`);
    await page.getByLabel('Numéro de téléphone').fill(`601${suffixe}`);
    await page.getByLabel('Mot de passe', { exact: true }).fill(motDePasse);
    await page.getByRole('button', { name: 'Créer mon compte' }).click();
    await page.getByRole('link', { name: 'Plus tard' }).click(ATTENTE);
    await page.getByRole('radio', { name: /^BEPC/ }).click();
    await page.getByRole('button', { name: 'Continuer' }).click();
    await page.getByRole('radio', { name: /30 min/ }).click();
    await page
        .getByRole('button', { name: 'Faire mon premier exercice' })
        .click();
    await expect(page).toHaveURL(/\/eleve\/seances\//, ATTENTE);

    // Le service worker contrôle la page, et la séance a sa copie.
    await page.waitForFunction(
        () => navigator.serviceWorker?.controller !== null,
        null,
        {
            timeout: 30_000,
        },
    );
    await page.reload();
    await expect(page.getByRole('button', { name: 'Vérifier' })).toBeVisible(
        ATTENTE,
    );
    const total = Number(
        (
            await page
                .getByText(/^\d+\/\d+$/)
                .first()
                .textContent()
        )?.split('/')[1],
    );
    expect(total).toBeGreaterThanOrEqual(10);

    // Mode avion.
    await context.setOffline(true);
    const capturees = new Set<string>();
    let repondues = 0;

    async function repondreA(nombre: number) {
        for (let i = 0; i < nombre; i++) {
            const g = await genre(page);

            if (g && !capturees.has(g)) {
                capturees.add(g);
                await capturerPartout(page, `seance-${g}`);
            }

            await repondreAuHasard(page);
            await expect(
                page.getByText(/^(Juste !|Pas encore|En partie juste)/).last(),
            ).toBeVisible();

            if (g === 'ouverte' && !capturees.has('ouverte-evaluee')) {
                capturees.add('ouverte-evaluee');
                await capturerPartout(page, 'seance-ouverte-evaluee');
            }

            repondues++;
            const suite = page.getByRole('button', {
                name: /^(Continuer|Voir mon bilan)$/,
            });
            await suite.click();
        }
    }

    // Trois réponses, puis l'élève recharge la page, toujours sans réseau.
    await repondreA(3);
    await page.reload();
    await expect(
        page
            .getByText(/^Séance du jour au .+gardée sur ce téléphone$|Vérifier/)
            .first(),
    ).toBeVisible(ATTENTE);
    // La séance reprend à la quatrième question : rien n'est perdu.
    await expect(
        page.getByText(new RegExp(`^4/${total}$`)).first(),
    ).toBeVisible();

    await repondreA(total - repondues);
    await expect(
        page.getByRole('heading', { name: /Séance terminée/ }),
    ).toBeVisible(ATTENTE);
    await expect(page.getByText(/gardées sur le téléphone/)).toBeVisible();
    // Hors ligne, les envois tentés échouent : le serveur n'a rien reçu.
    expect(verdicts).toEqual([]);

    // Retour du réseau : tout part, une fois.
    await context.setOffline(false);
    await expect(page.getByText(/gardées sur le téléphone/)).toBeHidden({
        timeout: 60_000,
    });

    const tentatives = new Set(
        envois
            .filter((e) => e.type === 'tentative.enregistrer')
            .map((e) => e.uuid),
    );
    const recues = verdicts.filter((v) => tentatives.has(v.uuid));
    expect(tentatives.size, 'une tentative par question').toBe(total);
    expect(
        recues,
        'chaque réponse reçue une seule fois, acceptée',
    ).toHaveLength(total);
    expect(new Set(recues.map((v) => v.uuid)).size).toBe(total);
    expect(
        verdicts.filter((v) => v.verdict !== 'acceptee'),
        'aucun refus, aucun doublon',
    ).toEqual([]);

    // Suppression du compte : la base de développement reste propre.
    await page.goto('/compte/profil');
    await expect(
        page.getByRole('heading', { level: 1, name: 'Mon compte' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Supprimer mon compte' }).click();
    const dialogue = page.getByRole('dialog');
    await dialogue.getByLabel('Mot de passe', { exact: true }).fill(motDePasse);
    await dialogue
        .getByRole('button', { name: 'Supprimer définitivement' })
        .click();
    await expect(page).toHaveURL(/\/$/, ATTENTE);
});
