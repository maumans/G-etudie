import { defineConfig } from '@playwright/test';

/**
 * Vérification visuelle (DESIGN.md § 12, CLAUDE.md § 6). Les captures de
 * référence vivent dans tests/visuel/captures/<lot>/<ecran>-<gabarit>-<theme>.png
 * et se régénèrent après validation volontaire :
 *   npx playwright test --update-snapshots
 *
 * Elles sont prises sur le build (`npm run build`), jamais sur `npm run dev` :
 * vérifier que public/hot n'existe pas.
 */
export default defineConfig({
    testDir: 'tests/visuel',
    outputDir: 'test-results',
    snapshotPathTemplate: 'tests/visuel/captures/{arg}{ext}',
    fullyParallel: true,
    reporter: [['list']],
    timeout: 60_000,
    expect: {
        toHaveScreenshot: {
            animations: 'disabled',
            caret: 'hide',
            maxDiffPixelRatio: 0.01,
        },
    },
    use: {
        baseURL: 'http://127.0.0.1:8000',
        locale: 'fr-FR',
        timezoneId: 'Africa/Conakry',
    },
    projects: [
        { name: 'connexion', testMatch: /connexion\.setup\.ts/ },
        {
            name: 'ecrans',
            testMatch: /\.spec\.ts/,
            testIgnore: /parcours-lot[12]\.spec\.ts/,
            dependencies: ['connexion'],
        },
        // Crée puis efface une leçon : après les captures, qu'il ne doit pas
        // perturber (compteurs du tableau de bord, file de relecture).
        {
            name: 'parcours-contenu',
            testMatch: /parcours-lot1\.spec\.ts/,
            dependencies: ['ecrans'],
        },
        // Crée un élève neuf, du formulaire d'inscription au premier
        // exercice, puis le supprime : après les captures des élèves de démo.
        {
            name: 'parcours-eleve',
            testMatch: /parcours-lot2\.spec\.ts/,
            dependencies: ['ecrans'],
        },
    ],
    webServer: {
        command: 'php artisan serve --host=127.0.0.1 --port=8000',
        url: 'http://127.0.0.1:8000/up',
        reuseExistingServer: true,
        timeout: 60_000,
    },
});
