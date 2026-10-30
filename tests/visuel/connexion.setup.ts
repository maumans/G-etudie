import { readFileSync } from 'node:fs';
import { expect, test as preparation } from '@playwright/test';
import { SESSION } from './gabarits';

/**
 * Se connecte une fois et garde la session pour les écrans connectés.
 *
 * Compte : l'élève de démonstration de database/seeders/DatabaseSeeder.php
 * (`php artisan db:seed`, base de développement seulement). Son mot de passe
 * est lu dans .env (DEMO_MOT_DE_PASSE), jamais écrit ici.
 */
function motDePasseDemonstration(): string {
    const env = readFileSync('.env', 'utf8');
    const trouve = env.match(/^DEMO_MOT_DE_PASSE=(.+)$/m);

    if (!trouve) {
        throw new Error(
            'DEMO_MOT_DE_PASSE absent de .env : voir DatabaseSeeder.',
        );
    }

    return trouve[1].trim().replace(/^"|"$/g, '');
}

preparation("connexion de l'élève de démonstration", async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Numéro de téléphone').fill('600000001');
    await page
        .getByLabel('Mot de passe', { exact: true })
        .fill(motDePasseDemonstration());
    await page.getByRole('button', { name: 'Se connecter' }).click();

    await expect(page).toHaveURL(/\/eleve$/);
    await page.context().storageState({ path: SESSION });
});
