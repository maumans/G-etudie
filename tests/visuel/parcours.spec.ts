import { expect, test } from '@playwright/test';

/**
 * Parcours de bout en bout par les vrais écrans (CLAUDE.md § 4 : un test
 * passe par la porte d'entrée, pas seulement par des données posées en base).
 * Le compte créé est supprimé à la fin par « Mon compte » : la base de
 * développement reste propre.
 */
test.use({ viewport: { width: 360, height: 740 } });

test('inscription, vérification proposée sans être imposée, puis suppression du compte', async ({
    page,
}) => {
    // Numéro de test aléatoire dans une plage de démonstration (6 00 …).
    const suffixe = String(Math.floor(Math.random() * 1_000_000)).padStart(
        6,
        '0',
    );
    const numero = `600${suffixe}`;
    const motDePasse = 'parcours-2027';

    await page.goto('/register');
    await page.getByLabel('Prénom').fill('Mamadou');
    await page.getByLabel('Pseudo').fill(`parcours_${suffixe}`);
    await page.getByLabel('Numéro de téléphone').fill(numero);
    await page.getByLabel('Mot de passe', { exact: true }).fill(motDePasse);
    await page.getByRole('button', { name: 'Créer mon compte' }).click();

    // La vérification du numéro est proposée…
    await expect(page).toHaveURL(/\/compte\/verification$/);
    await expect(
        page.getByRole('heading', { name: 'Vérifie ton numéro' }),
    ).toBeVisible();

    // … mais « Plus tard » ouvre tout de suite l'espace élève, qui commence
    // par le parcours d'accueil (lot 2 ; le rappel du numéro attend sur
    // l'accueil, parcours-lot2.spec.ts).
    await page.getByRole('link', { name: 'Plus tard' }).click();
    await expect(page).toHaveURL(/\/eleve\/bienvenue$/);
    await expect(
        page.getByRole('heading', { name: /^Bienvenue, Mamadou\./ }),
    ).toBeVisible();

    // Suppression par « Mon compte ».
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

    await expect(page).toHaveURL(/\/$/);

    // Le compte n'existe plus : la connexion échoue.
    await page.goto('/login');
    await page.getByLabel('Numéro de téléphone').fill(numero);
    await page.getByLabel('Mot de passe', { exact: true }).fill(motDePasse);
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await expect(
        page.getByText('Ces identifiants ne correspondent à aucun compte.'),
    ).toBeVisible();
});
