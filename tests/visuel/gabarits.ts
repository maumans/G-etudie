import AxeBuilder from '@axe-core/playwright';
import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/** Matrice de DESIGN.md § 12 : l'Android d'entrée de gamme est l'appareil de référence. */
export const GABARITS = [
    { nom: '360', largeur: 360, hauteur: 740 },
    { nom: '412', largeur: 412, hauteur: 915 },
    { nom: '768', largeur: 768, hauteur: 1024 },
    { nom: '1366', largeur: 1366, hauteur: 768 },
] as const;

export const THEMES = [
    { nom: 'clair', schema: 'light' },
    { nom: 'sombre', schema: 'dark' },
] as const;

/** Rien ne doit déborder horizontalement, même à 360 px. */
export async function verifierSansDebordement(page: Page): Promise<void> {
    const largeurs = await page.evaluate(() => ({
        document: document.documentElement.scrollWidth,
        fenetre: window.innerWidth,
    }));

    expect(largeurs.document, 'débordement horizontal').toBeLessThanOrEqual(
        largeurs.fenetre,
    );

    // Un contenu peut sortir de son cadre sans élargir la page (grille à
    // plusieurs colonnes) : chaque champ, zone de donnée et état vide doit
    // contenir ce qu'il affiche.
    const cadresDebordants = await page.evaluate(() =>
        [
            ...document.querySelectorAll(
                '[data-slot="champ"], [data-slot="zone-donnee"], [data-slot="etat-vide"]',
            ),
        ]
            .filter((cadre) => {
                const droite = cadre.getBoundingClientRect().right + 1;

                return [...cadre.querySelectorAll('*')].some(
                    (enfant) => enfant.getBoundingClientRect().right > droite,
                );
            })
            .map(
                (cadre) =>
                    `${cadre.getAttribute('data-slot')} : ${(cadre.textContent ?? '').slice(0, 40)}`,
            ),
    );

    expect(cadresDebordants, 'contenu qui sort de son cadre').toEqual([]);
}

/** Audit axe : aucune violation sérieuse ou critique (WCAG 2.1 A et AA). */
export async function verifierAccessibilite(page: Page): Promise<void> {
    const resultat = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

    const graves = resultat.violations
        .filter((v) => v.impact === 'serious' || v.impact === 'critical')
        .map((v) => ({
            regle: v.id,
            impact: v.impact,
            aide: v.help,
            elements: v.nodes.slice(0, 5).map((n) => n.target.join(' ')),
        }));

    expect(graves, JSON.stringify(graves, null, 2)).toEqual([]);
}

/**
 * Sessions des comptes de démonstration (DemoSeeder), écrites par
 * connexion.setup.ts : un compte par espace.
 */
export const SESSIONS = {
    eleve: 'tests/visuel/.auth/eleve.json',
    /** Second élève (Bac SE, rien encore de fait), lot 2. */
    ousmane: 'tests/visuel/.auth/ousmane.json',
    /** Rédacteur de démonstration. */
    contenu: 'tests/visuel/.auth/contenu.json',
    /** Responsable pédagogique : référentiel et relecture (lot 1). */
    pedagogie: 'tests/visuel/.auth/pedagogie.json',
    console: 'tests/visuel/.auth/console.json',
} as const;

/**
 * Vérifie un écran (débordement, axe) puis le compare à sa capture de
 * référence `captures/<lot>/<ecran>-<gabarit>-<theme>.png`.
 */
export async function capturer(
    page: Page,
    lot: string,
    ecran: string,
    gabarit: string,
    theme: string,
    { figerVariables = false }: { figerVariables?: boolean } = {},
): Promise<void> {
    await page.evaluate(() => document.fonts.ready);

    // Dates relatives (« il y a 4 heures ») : masquées, mais leur longueur
    // change la mise en page d'un passage à l'autre. On leur donne un texte
    // de longueur fixe avant de comparer.
    if (figerVariables) {
        await page.evaluate(() => {
            for (const element of document.querySelectorAll(
                '[data-capture="variable"]',
            )) {
                element.textContent = '00 xxx, 00:00';
            }
        });
    }

    await verifierSansDebordement(page);
    await verifierAccessibilite(page);
    // Tableau de segments : une chaîne « lot0/… » serait aplatie en « lot0-… ».
    await expect(page).toHaveScreenshot(
        [lot, `${ecran}-${gabarit}-${theme}.png`],
        {
            fullPage: true,
            // Heures, durées écoulées : changent à chaque passage.
            mask: [page.locator('[data-capture="variable"]')],
        },
    );
}

/**
 * Répond à la question affichée dans l'ardoise, quel que soit son type
 * (lot 3) : première proposition, « 1 » pour un nombre, premier choix des
 * listes, une phrase pour une rédaction — puis « Vérifier » et, pour une
 * rédaction, l'auto-évaluation (premier critère coché).
 */
export async function repondreAuHasard(page: Page): Promise<void> {
    const principal = page.getByRole('main');
    const radios = principal.getByRole('radio');
    const cases = principal.getByRole('checkbox');
    const listes = principal.locator('select');
    const champs = principal.locator('input:not([type=hidden]), textarea');

    if ((await radios.count()) > 0) {
        await radios.first().click();
    } else if ((await cases.count()) > 0) {
        await cases.first().click();
    }

    for (let i = 0; i < (await listes.count()); i++) {
        await listes.nth(i).selectOption({ index: 1 });
    }

    for (let i = 0; i < (await champs.count()); i++) {
        const champ = champs.nth(i);
        const decimal = (await champ.getAttribute('inputmode')) === 'decimal';

        await champ.fill(decimal ? '1' : 'réponse');
    }

    await page.getByRole('button', { name: 'Vérifier' }).click();

    const valider = page.getByRole('button', {
        name: 'Valider mon auto-évaluation',
    });

    if (await valider.isVisible()) {
        await page.getByRole('checkbox').first().click();
        await valider.click();
    }

    await expect(
        page.getByRole('button', { name: /^(Continuer|Voir mon bilan)$/ }),
    ).toBeVisible();
}
