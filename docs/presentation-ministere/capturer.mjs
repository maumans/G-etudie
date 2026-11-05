/**
 * Captures du dossier de présentation (ministère) : l'application telle
 * qu'elle est, données de démonstration (bandeau « EXEMPLE »), sans masque.
 * Sessions de démo écrites par tests/visuel/connexion.setup.ts.
 *
 *   node docs/presentation-ministere/capturer.mjs [nom-ecran]
 *
 * Les réponses données pendant les captures ne partent jamais au serveur
 * (/sync/operations simulé, qui les dit acceptées pour que la file se vide) :
 * le compte de démonstration n'est pas modifié.
 */
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const BASE = 'http://127.0.0.1:8000';
const SORTIE = 'docs/presentation-ministere/captures';
const MOBILE = { viewport: { width: 360, height: 780 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true };
const ORDI = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 };
const SESSIONS = {
    aucune: undefined,
    eleve: 'tests/visuel/.auth/eleve.json',
    ousmane: 'tests/visuel/.auth/ousmane.json',
    contenu: 'tests/visuel/.auth/contenu.json',
    pedagogie: 'tests/visuel/.auth/pedagogie.json',
};
const ATTENTE = 45_000;

async function titre(page, nom) {
    await page.getByRole('heading', { level: 1, name: nom }).first().waitFor({ timeout: ATTENTE });
}

async function aller(page, adresse, nom) {
    await page.goto(BASE + adresse, { timeout: ATTENTE });
    await titre(page, nom);
}

async function annale(page, session) {
    await aller(page, '/eleve/annales', /annales/i);
    await page.getByRole('link', { name: session }).first().click();
    await page.waitForURL(/\/eleve\/annales\/[0-9a-f-]{36}/, { timeout: ATTENTE });
    await page.getByRole('tab', { name: /Lecture/ }).waitFor({ timeout: ATTENTE });
    await page.waitForTimeout(800);
}

async function lecon(page, nom) {
    await aller(page, '/contenu/lecons', 'Les leçons');
    await page.getByRole('link', { name: nom, exact: true }).first().click();
    await titre(page, nom);
}

/** [nom, session, appareil, ouvrir, pleine page ?] */
const ECRANS = [
    ['vitrine', 'aucune', ORDI, (p) => aller(p, '/', /Tout pour réussir/), false],
    ['vitrine-mobile', 'aucune', MOBILE, (p) => aller(p, '/', /Tout pour réussir/), false],
    ['connexion', 'aucune', MOBILE, (p) => aller(p, '/login', 'Se connecter'), false],
    ['choix-examen', 'ousmane', MOBILE, (p) => aller(p, '/eleve/bienvenue', /./), false],
    ['accueil', 'eleve', MOBILE, (p) => aller(p, '/eleve', /^Bon(jour|soir), Aïssatou$/), false],
    ['accueil-suite', 'eleve', MOBILE, async (p) => {
        await aller(p, '/eleve', /^Bon(jour|soir), Aïssatou$/);
        await p.evaluate(() => {
            const cible = [...document.querySelectorAll('h2')].find((h) => h.textContent?.includes('Ma jauge'));
            window.scrollTo(0, (cible?.getBoundingClientRect().top ?? 0) + window.scrollY - 80);
        });
    }, false],
    ['accueil-ordinateur', 'eleve', ORDI, (p) => aller(p, '/eleve', /^Bon(jour|soir), Aïssatou$/), false],
    ['cours', 'eleve', MOBILE, (p) => aller(p, '/eleve/cours', 'Mes cours'), false],
    ['matiere', 'eleve', MOBILE, (p) => aller(p, '/eleve/cours/maths', 'Mathématiques'), false],
    ['lecon', 'eleve', MOBILE, async (p) => {
        await aller(p, '/eleve/cours/maths', 'Mathématiques');
        await p.getByRole('link', { name: /Le théorème de Pythagore/ }).first().click();
        await titre(p, 'Le théorème de Pythagore');
        await p.waitForTimeout(800);
    }, false],
    ['seance-question', 'eleve', MOBILE, async (p) => {
        await aller(p, '/eleve', /^Bon(jour|soir), Aïssatou$/);
        await p.getByRole('button', { name: /^(Commencer|Une autre séance)$/ }).first().click()
            .catch(() => p.getByRole('link', { name: 'Reprendre' }).first().click());
        await p.getByRole('button', { name: 'Vérifier' }).waitFor({ timeout: ATTENTE });
        await p.waitForTimeout(800);
    }, false],
    ['seance-verdict', 'eleve', MOBILE, async (p) => {
        await aller(p, '/eleve', /^Bon(jour|soir), Aïssatou$/);
        await p.getByRole('button', { name: /^(Commencer|Une autre séance)$/ }).first().click()
            .catch(() => p.getByRole('link', { name: 'Reprendre' }).first().click());
        await p.getByRole('button', { name: 'Vérifier' }).waitFor({ timeout: ATTENTE });
        const principal = p.getByRole('main');
        const radios = principal.getByRole('radio');
        if ((await radios.count()) > 0) {
            await radios.first().check({ force: true });
        } else {
            await principal.locator('input:not([type=hidden]), textarea').first().fill('(x-4)(x+4)');
        }
        await p.getByRole('button', { name: 'Vérifier' }).click();
        await p.waitForTimeout(1500);
    }, false],
    ['annales', 'eleve', MOBILE, (p) => aller(p, '/eleve/annales', /annales/i), false],
    ['annale', 'eleve', MOBILE, (p) => annale(p, /BEPC 2024/), false],
    ['examen-blanc-lancement', 'eleve', MOBILE, async (p) => {
        await annale(p, /BEPC 2024/);
        await p.getByRole('tab', { name: /Conditions réelles|Examen/ }).click();
        await p.getByRole('heading', { name: 'Comme le jour de l’examen' }).waitFor({ timeout: ATTENTE });
    }, false],
    ['examen-blanc-passage', 'eleve', MOBILE, async (p) => {
        await annale(p, /BEPC 2024/);
        await p.getByRole('tab', { name: /Conditions réelles|Examen/ }).click();
        await p.getByRole('button', { name: /^Commencer l’examen/ }).click();
        await p.getByRole('dialog', { name: /Examen blanc/ }).waitFor({ timeout: ATTENTE });
        await p.waitForTimeout(800);
    }, false],
    ['examens-blancs', 'eleve', MOBILE, (p) => aller(p, '/eleve/examens-blancs', /examens blancs/i), false],
    ['examen-blanc-resultat', 'eleve', MOBILE, async (p) => {
        await aller(p, '/eleve/examens-blancs', /examens blancs/i);
        await p.getByRole('link', { name: /BEPC 2024/ }).first().click();
        await p.getByRole('heading', { name: 'Partie par partie' }).waitFor({ timeout: ATTENTE });
        await p.evaluate(() => window.scrollTo(0, 0));
    }, false],
    ['progression', 'eleve', MOBILE, (p) => aller(p, '/eleve/progression', 'Ma progression'), false],
    ['progression-notions', 'eleve', MOBILE, async (p) => {
        await aller(p, '/eleve/progression', 'Ma progression');
        await p.evaluate(() => {
            const cible = [...document.querySelectorAll('h2')].find((h) => h.textContent?.includes('Notion par notion'));
            window.scrollTo(0, (cible?.getBoundingClientRect().top ?? 0) + window.scrollY - 80);
        });
    }, false],
    ['progression-ordinateur', 'eleve', ORDI, (p) => aller(p, '/eleve/progression', 'Ma progression'), false],
    ['matiere-a-travailler', 'eleve', MOBILE, (p) => aller(p, '/eleve/cours/maths?faibles=1', 'Mathématiques'), false],
    ['equipe-accueil', 'pedagogie', ORDI, (p) => aller(p, '/contenu', /^Bon(jour|soir), Alpha$/), false],
    ['equipe-programme', 'pedagogie', ORDI, (p) => aller(p, '/contenu/referentiel/programme', 'Le référentiel pédagogique'), false],
    ['equipe-relecture', 'pedagogie', ORDI, (p) => aller(p, '/contenu/relecture', 'À relire'), false],
    ['equipe-signalements', 'pedagogie', ORDI, (p) => aller(p, '/contenu/signalements', /signalements/i), false],
    ['equipe-editeur', 'contenu', ORDI, async (p) => {
        await lecon(p, 'Les identités remarquables');
        await p.getByRole('link', { name: 'Continuer la rédaction' }).click();
        await p.getByRole('textbox', { name: 'Contenu de la leçon' }).waitFor({ timeout: ATTENTE });
        await p.waitForTimeout(1000);
    }, false],
    ['equipe-lecon-publiee', 'contenu', ORDI, (p) => lecon(p, 'Le théorème de Pythagore'), false],
    ['equipe-import', 'contenu', ORDI, (p) => aller(p, '/contenu/annales/importer', /./), false],
    ['equipe-annales', 'contenu', ORDI, (p) => aller(p, '/contenu/annales', /annales/i), false],
];

mkdirSync(SORTIE, { recursive: true });
const seul = process.argv[2];
const navigateur = await chromium.launch();

for (const [nom, session, appareil, ouvrir, pleine] of ECRANS) {
    if (seul && seul !== nom) continue;
    const contexte = await navigateur.newContext({
        ...appareil,
        locale: 'fr-FR',
        timezoneId: 'Africa/Conakry',
        colorScheme: 'light',
        storageState: SESSIONS[session],
    });
    await contexte.route('**/sync/operations', async (route) => {
        const corps = route.request().postDataJSON();
        await route.fulfill({
            json: {
                heure_serveur: new Date().toISOString(),
                resultats: corps.operations.map((o) => ({ uuid: o.uuid, verdict: 'acceptee', resultat: null })),
            },
        });
    });
    const page = await contexte.newPage();
    try {
        await ouvrir(page);
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(500);
        await page.screenshot({ path: `${SORTIE}/${nom}.png`, fullPage: pleine });
        console.log('ok', nom);
    } catch (erreur) {
        console.log('ÉCHEC', nom, String(erreur).split('\n')[0]);
    }
    await contexte.close();
}

await navigateur.close();
