import { defineConfig } from '@playwright/test';

/**
 * Vérification visuelle (DESIGN.md § 12, CLAUDE.md § 6). Les captures de
 * référence vivent dans tests/visuel/captures/<lot>/<ecran>-<gabarit>-<theme>.png
 * et se régénèrent après validation volontaire :
 *   npx playwright test --update-snapshots
 *
 * Elles sont prises sur le build (`npm run build`), jamais sur `npm run dev` :
 * vérifier que public/hot n'existe pas.
 *
 * Port : 8000, ou `PLAYWRIGHT_PORT` quand un autre projet l'occupe
 * (`reuseExistingServer` reprendrait sinon ce projet-là sans rien dire).
 */
const PORT = process.env.PLAYWRIGHT_PORT ?? '8000';
export const ADRESSE = `http://127.0.0.1:${PORT}`;

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
        baseURL: ADRESSE,
        locale: 'fr-FR',
        timezoneId: 'Africa/Conakry',
    },
    projects: [
        { name: 'connexion', testMatch: /connexion\.setup\.ts/ },
        {
            name: 'ecrans',
            testMatch: /\.spec\.ts/,
            testIgnore: /parcours-lot(?:[123459]|10|12|13)\.spec\.ts/,
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
        // Un élève neuf fait sa séance en mode avion (HORS_LIGNE.md A.14
        // n° 24), puis le supprime. Après les deux autres parcours : trois
        // parcours en même temps sur `php artisan serve` (une requête à la
        // fois) faisaient manquer ses délais au parcours du lot 1.
        // Importe une annale, la publie et la fait lire (lot 4), puis
        // l'efface : après les captures, comme le parcours du lot 1.
        {
            name: 'parcours-annales',
            testMatch: /parcours-lot4\.spec\.ts/,
            dependencies: ['parcours-contenu'],
        },
        // Un examen blanc interrompu (onglet fermé), repris, noté une fois
        // (lot 5) ; l'examen est effacé à la fin.
        {
            name: 'parcours-examen',
            testMatch: /parcours-lot5\.spec\.ts/,
            dependencies: ['parcours-annales'],
        },
        // Lot 9 : Ousmane paie l'année, le webhook est rejoué ; le paiement
        // et son abonnement sont effacés à la fin.
        {
            name: 'parcours-paiement',
            testMatch: /parcours-lot9\.spec\.ts/,
            dependencies: ['ecrans'],
        },
        // Lot 10 : Aïssatou demande « Explique-moi » (premier mot sous 3 s),
        // puis une question hors sujet ; ses conversations sont effacées.
        {
            name: 'parcours-tuteur',
            testMatch: /parcours-lot10\.spec\.ts/,
            dependencies: ['ecrans'],
        },
        // Lot 12 : Aïssatou signale un message du fil, Fatoumata le masque en
        // un geste ; puis un quiz de culture. Tout est défait à la fin.
        {
            name: 'parcours-communaute',
            testMatch: /parcours-lot12\.spec\.ts/,
            dependencies: ['ecrans'],
        },
        // Lot 13 : Sékou télécharge le rapport d'impact (le critère) ; l'export
        // écrit au journal des accès, effacé à la fin.
        {
            name: 'parcours-impact',
            testMatch: /parcours-lot13\.spec\.ts/,
            dependencies: ['ecrans'],
        },
        {
            name: 'parcours-hors-ligne',
            testMatch: /parcours-lot3\.spec\.ts/,
            dependencies: ['parcours-contenu', 'parcours-eleve'],
        },
    ],
    webServer: {
        command: `php artisan serve --host=127.0.0.1 --port=${PORT}`,
        // Lot 10 : les captures et les parcours ne paient jamais un appel à
        // l'API Claude, même avec une clé dans .env (tuteur et import simulés).
        // Ne vaut que pour un serveur lancé par Playwright : un serveur déjà
        // ouvert sur ce port garde son .env (`reuseExistingServer`).
        env: { TUTEUR_MOTEUR: 'simule', ANNALES_EXTRACTEUR: 'simule' },
        url: `${ADRESSE}/up`,
        reuseExistingServer: true,
        timeout: 60_000,
    },
});
