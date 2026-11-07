/**
 * Critère du lot 8 (PLAN_NKARAMOGO.md § 12) : Lighthouse mobile ≥ 90 en
 * performance, accessibilité et SEO sur la page d'accueil.
 *
 * À lancer sur le **build** (pas de `public/hot`), **dans les conditions de
 * production** : `php artisan serve` ne compresse rien et tourne sans
 * OPcache (1 s par page) — mesurée derrière lui, la vitrine perd 15 points
 * qu'elle n'a pas chez l'élève. Trois terminaux :
 *     npm run build
 *     cd public && php -d zend_extension=opcache -d opcache.enable=1 \
 *         -d opcache.enable_cli=1 -S 127.0.0.1:8001 \
 *         ../vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php
 *     AMONT=8001 PORT=8081 node tests/lighthouse/relais-production.mjs
 *     LIGHTHOUSE_URL=http://127.0.0.1:8081 npm run test:lighthouse
 * (Relais : gzip et cache du build, comme le bloc Nginx de
 * MISE_EN_PRODUCTION.md.) En production réelle : PageSpeed Insights sur
 * le domaine (A_TESTER.md, lot 8).
 *
 * Utilise le Chromium de Playwright (pas de Chrome à installer). Profil
 * mobile de Lighthouse par défaut (Moto G Power, 4G lente simulée,
 * processeur ralenti ×4). Chaque page est mesurée trois fois, après un
 * passage de chauffe non compté : la médiane compte (une mesure isolée
 * varie de quelques points).
 * Rapports HTML dans `test-results/lighthouse/`.
 *
 * Variables : LIGHTHOUSE_URL (défaut http://127.0.0.1:8000),
 * LIGHTHOUSE_PAGES (défaut « / »), LIGHTHOUSE_SEUIL (défaut 90).
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { launch } from 'chrome-launcher';
import lighthouse from 'lighthouse';
import { chromium } from 'playwright';

const base = process.env.LIGHTHOUSE_URL ?? 'http://127.0.0.1:8000';
const pages = (process.env.LIGHTHOUSE_PAGES ?? '/').split(',');
const seuil = Number(process.env.LIGHTHOUSE_SEUIL ?? 90);
const categories = ['performance', 'accessibility', 'seo'];
const passages = 3;

if (existsSync('public/hot')) {
    console.error(
        'public/hot existe : arrêter `npm run dev` (mesure sur le build seulement).',
    );
    process.exit(1);
}

mkdirSync('test-results/lighthouse', { recursive: true });

const chrome = await launch({
    chromePath: chromium.executablePath(),
    chromeFlags: ['--headless=new', '--no-sandbox'],
});

let echec = false;

try {
    for (const chemin of pages) {
        const url = new URL(chemin, base).toString();
        const scores = { performance: [], accessibility: [], seo: [] };
        let dernier;

        const mesurer = () =>
            lighthouse(url, {
                port: chrome.port,
                output: 'html',
                onlyCategories: categories,
                locale: 'fr',
                logLevel: 'error',
            });

        // Un passage de chauffe, non compté : le premier passage d'un Chrome
        // neuf (processus, caches internes du navigateur, rendu serveur
        // encore froid) perd 15 à 25 points qu'aucune visite réelle ne perd
        // sur un serveur en service. Le cache HTTP, lui, est vidé à chaque
        // passage par Lighthouse : chaque mesure reste une première visite.
        const chauffe = await mesurer();
        console.log(
            `${chemin} (chauffe, non comptée) → performance ${Math.round(chauffe.lhr.categories.performance.score * 100)}`,
        );

        for (let i = 0; i < passages; i++) {
            const resultat = await mesurer();
            dernier = resultat;

            for (const c of categories) {
                scores[c].push(
                    Math.round(resultat.lhr.categories[c].score * 100),
                );
            }
        }

        const nom = chemin === '/' ? 'accueil' : chemin.replace(/\W+/g, '-');
        writeFileSync(`test-results/lighthouse/${nom}.html`, dernier.report);

        const mediane = (liste) =>
            [...liste].sort((a, b) => a - b)[Math.floor(liste.length / 2)];
        const ligne = categories
            .map((c) => `${c} ${mediane(scores[c])} (${scores[c].join(', ')})`)
            .join(' · ');
        console.log(`${chemin} → ${ligne}`);

        for (const c of categories) {
            if (mediane(scores[c]) < seuil) {
                echec = true;
                const audits = Object.values(dernier.lhr.audits)
                    .filter(
                        (a) =>
                            a.score !== null &&
                            a.score < 0.9 &&
                            a.scoreDisplayMode !== 'informative',
                    )
                    .map((a) => `   - ${a.id} : ${a.displayValue ?? a.score}`)
                    .slice(0, 12);
                console.log(`  ✗ ${c} < ${seuil}\n${audits.join('\n')}`);
            }
        }
    }
} finally {
    chrome.kill();
}

process.exit(echec ? 1 : 0);
