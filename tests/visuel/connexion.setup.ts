import { readFileSync } from 'node:fs';
import { expect, test as preparation } from '@playwright/test';
import type { Page } from '@playwright/test';
import { SESSIONS } from './gabarits';

/**
 * Se connecte une fois par espace et garde les sessions pour les écrans
 * connectés.
 *
 * Comptes : ceux de database/seeders/DemoSeeder.php (`php artisan db:seed`,
 * base de développement seulement). Leur mot de passe est lu dans .env
 * (DEMO_MOT_DE_PASSE), jamais écrit ici.
 */
function motDePasseDemonstration(): string {
    const env = readFileSync('.env', 'utf8');
    const trouve = env.match(/^DEMO_MOT_DE_PASSE=(.+)$/m);

    if (!trouve) {
        throw new Error('DEMO_MOT_DE_PASSE absent de .env : voir DemoSeeder.');
    }

    return trouve[1].trim().replace(/^"|"$/g, '');
}

/**
 * Connexion puis aiguillage (/login → /accueil → espace) : trois requêtes, et
 * les trois préparations tournent en parallèle sur `php artisan serve`, qui
 * ne traite qu'une requête à la fois.
 */
const ATTENTE = { timeout: 30_000 };

async function seConnecter(page: Page, numero: string): Promise<void> {
    await page.goto('/login');
    await page.getByLabel('Numéro de téléphone').fill(numero);
    await page
        .getByLabel('Mot de passe', { exact: true })
        .fill(motDePasseDemonstration());
    await page.getByRole('button', { name: 'Se connecter' }).click();
}

preparation("connexion de l'élève de démonstration", async ({ page }) => {
    await seConnecter(page, '600000001');

    await expect(page).toHaveURL(/\/eleve$/, ATTENTE);
    await page.context().storageState({ path: SESSIONS.eleve });
});

preparation('connexion du rédacteur de démonstration', async ({ page }) => {
    await seConnecter(page, '600000004');

    await expect(page).toHaveURL(/\/contenu$/, ATTENTE);
    await page.context().storageState({ path: SESSIONS.contenu });
});

preparation(
    'connexion du responsable pédagogique de démonstration',
    async ({ page }) => {
        await seConnecter(page, '600000006');

        await expect(page).toHaveURL(/\/contenu$/, ATTENTE);
        await page.context().storageState({ path: SESSIONS.pedagogie });
    },
);

preparation(
    "connexion de l'administrateur plateforme, mot de passe confirmé",
    async ({ page }) => {
        await seConnecter(page, '600000008');
        await expect(page).toHaveURL(/\/console$/, ATTENTE);

        // « Sécurité » est derrière la confirmation du mot de passe (3 h).
        await page.goto('/compte/securite');
        await page
            .getByLabel('Mot de passe', { exact: true })
            .fill(motDePasseDemonstration());
        await page.getByRole('button', { name: 'Confirmer' }).click();
        await expect(page).toHaveURL(/\/compte\/securite$/, ATTENTE);

        await page.context().storageState({ path: SESSIONS.console });
    },
);
