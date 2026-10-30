import { expect, test as preparation } from '@playwright/test';

/**
 * Se connecte une fois et garde la session pour les écrans connectés.
 *
 * Compte : celui de database/seeders/DatabaseSeeder.php (base de
 * développement seulement, `php artisan db:seed`). Il sera remplacé par les
 * comptes de démo par rôle, connectés par téléphone, aux étapes 4 et 5.
 */
import { SESSION } from './gabarits';

preparation('connexion du compte de démonstration', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[name="email"]').fill('test@example.com');
    await page.locator('input[name="password"]').fill('password');
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/eleve$/);
    await page.context().storageState({ path: SESSION });
});
