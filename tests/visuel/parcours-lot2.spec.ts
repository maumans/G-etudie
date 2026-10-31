import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { THEMES, capturer, repondreAuHasard } from './gabarits';

/**
 * Critère d'acceptation du lot 2 (PLAN § 12) : **un nouvel élève fait son
 * premier exercice en moins de 60 s après son inscription**. Par les vrais
 * écrans : inscription, vérification du numéro remise à plus tard,
 * parcours d'accueil, séance du jour, réponse vérifiée — puis la séance
 * jusqu'au bilan, l'accueil, et la suppression du compte par « Mon compte »
 * (la base de développement reste propre).
 *
 * Le parcours, l'ardoise et l'accueil d'un élève neuf sont capturés ici, sur
 * ce compte : leurs données ne dépendent que du parcours lui-même.
 */

const ATTENTE = { timeout: 20_000 };

/** Un jeudi matin à Conakry (UTC+0). */
const HORLOGE = new Date('2026-10-29T10:00:00Z');

/** DESIGN.md § 12 : téléphone, tablette, ordinateur. */
const TAILLES = [
    { nom: '360', largeur: 360, hauteur: 740 },
    { nom: '768', largeur: 768, hauteur: 1024 },
    { nom: '1366', largeur: 1366, hauteur: 768 },
] as const;

/**
 * Les réponses partent par la file : la pastille passe de « 1 réponse à
 * envoyer » à « Tout est envoyé » (transition de couleur). On capture une
 * fois tout envoyé et la transition finie.
 */
async function attendreEnvoi(page: Page): Promise<void> {
    const pastille = page
        .getByRole('button', { name: /voir le détail$/ })
        .filter({ visible: true })
        .first();

    if ((await pastille.count()) > 0) {
        await expect(pastille).toHaveAccessibleName(
            /^Tout est envoyé/,
            ATTENTE,
        );
        await page.waitForTimeout(300);
    }
}

async function capturerPartout(page: Page, ecran: string): Promise<void> {
    for (const taille of TAILLES) {
        for (const theme of THEMES) {
            await page.setViewportSize({
                width: taille.largeur,
                height: taille.hauteur,
            });
            await page.emulateMedia({ colorScheme: theme.schema });
            // Les couleurs passent par une transition : laisser le thème se poser.
            await page.waitForTimeout(400);
            await attendreEnvoi(page);
            await capturer(page, 'lot2', ecran, taille.nom, theme.nom);
        }
    }

    await page.setViewportSize({ width: 360, height: 740 });
    await page.emulateMedia({ colorScheme: 'light' });
}

test('un nouvel élève fait son premier exercice en moins de 60 s après son inscription', async ({
    page,
}) => {
    test.setTimeout(300_000);
    await page.clock.setFixedTime(HORLOGE);
    await page.setViewportSize({ width: 360, height: 740 });

    const suffixe = String(Math.floor(Math.random() * 1_000_000)).padStart(
        6,
        '0',
    );
    const numero = `600${suffixe}`;
    const motDePasse = 'parcours-2027';

    await page.goto('/register');
    await page.getByLabel('Prénom').fill('Mariam');
    await page.getByLabel('Pseudo').fill(`premier_${suffixe}`);
    await page.getByLabel('Numéro de téléphone').fill(numero);
    await page.getByLabel('Mot de passe', { exact: true }).fill(motDePasse);

    // Le chronomètre part à la création du compte.
    const debut = Date.now();
    await page.getByRole('button', { name: 'Créer mon compte' }).click();
    await page.getByRole('link', { name: 'Plus tard' }).click(ATTENTE);

    await expect(
        page.getByRole('heading', { name: /^Bienvenue, Mariam\./ }),
    ).toBeVisible(ATTENTE);
    await page.getByRole('radio', { name: /^BEPC/ }).click();
    await page.getByRole('button', { name: 'Continuer' }).click();
    await expect(
        page.getByRole('heading', { name: /Combien de temps/ }),
    ).toBeVisible();
    await page
        .getByRole('button', { name: 'Faire mon premier exercice' })
        .click();

    await expect(page).toHaveURL(/\/eleve\/seances\//, ATTENTE);
    await repondreAuHasard(page);
    await expect(
        page.getByText(/^(Juste !|Pas encore|En partie juste)/).last(),
    ).toBeVisible();

    const secondes = (Date.now() - debut) / 1000;
    console.info(
        `Premier exercice ${secondes.toFixed(1)} s après l'inscription.`,
    );
    expect(secondes, 'premier exercice en moins de 60 s').toBeLessThan(60);

    // L'ardoise après « Vérifier » : verdict et explication.
    await capturerPartout(page, 'seance-verdict');

    // La suite de la séance, n'importe quelle réponse, jusqu'au bilan.
    for (let rang = 0; rang < 20; rang++) {
        const suite = page.getByRole('button', { name: 'Continuer' });

        if (!(await suite.isVisible())) {
            break;
        }

        await suite.click();

        if (rang === 0) {
            await capturerPartout(page, 'seance-question');
        }

        await repondreAuHasard(page);
    }

    await page.getByRole('button', { name: 'Voir mon bilan' }).click();
    await expect(
        page.getByRole('heading', { name: /Séance terminée/ }),
    ).toBeVisible();
    // Toutes les réponses sont parties : plus de « gardées sur le téléphone ».
    await expect(page.getByText(/gardées sur le téléphone/)).toBeHidden(
        ATTENTE,
    );
    await capturerPartout(page, 'seance-bilan');

    // L'accueil d'un élève neuf : sa séance faite, ses premiers pas, le rappel du numéro.
    await page.getByRole('link', { name: "Retour à l'accueil" }).click();
    await expect(
        page.getByRole('heading', { name: /^Bonjour, Mariam$/ }),
    ).toBeVisible(ATTENTE);
    await expect(page.getByText('Vérifie ton numéro.')).toBeVisible();
    await expect(page.getByText('Séance faite.')).toBeVisible();
    await capturerPartout(page, 'eleve-accueil-premier-soir');

    // Le parcours d'accueil, capturé en changeant d'examen (sans enregistrer).
    await page.goto('/eleve/bienvenue');
    await expect(
        page.getByRole('heading', { name: /Quel examen prépares-tu/ }),
    ).toBeVisible(ATTENTE);
    await page.getByRole('radio', { name: /^Baccalauréat unique/ }).click();
    await page.getByRole('button', { name: 'Continuer' }).click();
    await expect(page.getByRole('heading', { name: /série/ })).toBeVisible();
    await page.getByRole('radio', { name: /^Bac SE/ }).click();
    await capturerPartout(page, 'bienvenue-serie');

    // Suppression du compte par « Mon compte » : après une séance (une
    // synchronisation par réponse), elle répondait 429 tant que la file et
    // « Mon compte » partageaient leur limite de débit (DEVBOOK, lot 2).
    await page.goto('/compte/profil');
    // Rendu par React : visible = le formulaire est branché (sinon envoi natif).
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
