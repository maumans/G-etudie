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

    // … mais « Plus tard » ouvre tout de suite l'espace élève, avec un rappel.
    await page.getByRole('link', { name: 'Plus tard' }).click();
    await expect(page).toHaveURL(/\/eleve$/);
    await expect(
        page.getByRole('heading', { name: /^Bon(jour|soir), Mamadou$/ }),
    ).toBeVisible();
    await expect(page.getByText('Vérifie ton numéro.')).toBeVisible();

    // Suppression par « Mon compte ».
    await page.getByRole('link', { name: 'Moi' }).click();
    await expect(page).toHaveURL(/\/compte\/profil$/);
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
