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
