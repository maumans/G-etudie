import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Contrastes du design system Ardoise (DESIGN.md § 2 et § 10), recalculés à
 * partir de resources/css/app.css : une valeur changée là sans vérification
 * fait échouer ce test. Texte ≥ 4,5:1 ; bordure de contrôle et icône porteuse
 * de sens ≥ 3:1 — dans les deux thèmes.
 */
const css = readFileSync(
    resolve(__dirname, '../../resources/css/app.css'),
    'utf8',
);

function lireVariables(bloc: string): Record<string, string> {
    const variables: Record<string, string> = {};

    for (const [, nom, valeur] of bloc.matchAll(
        /--([a-z0-9-]+):\s*(#[0-9a-f]{6})\s*;/gi,
    )) {
        variables[nom] = valeur.toLowerCase();
    }

    return variables;
}

function bloc(motif: RegExp): string {
    const trouve = css.match(motif);

    if (!trouve) {
        throw new Error(`Bloc introuvable dans app.css : ${motif}`);
    }

    return trouve[1];
}

const palettes = lireVariables(bloc(/@theme\s*\{([\s\S]*?)\n\}/));
const clair = lireVariables(bloc(/:root,\s*\.clair\s*\{([\s\S]*?)\n\}/));
const sombre = lireVariables(bloc(/\n\.dark\s*\{([\s\S]*?)\n\}/));

const couleur = (nom: string): string => {
    const valeur = palettes[`color-${nom}`];

    if (!valeur) {
        throw new Error(`Couleur absente de @theme : ${nom}`);
    }

    return valeur;
};

function luminance(hex: string): number {
    const [r, g, b] = [1, 3, 5].map((i) => {
        const c = parseInt(hex.slice(i, i + 2), 16) / 255;

        return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contraste(a: string, b: string): number {
    const [claire, foncee] = [luminance(a), luminance(b)].sort((x, y) => y - x);

    return (claire + 0.05) / (foncee + 0.05);
}

const BLANC = '#ffffff';
const MATIERES = [
    'maths',
    'physique',
    'chimie',
    'biologie',
    'francais',
    'anglais',
    'histoire',
    'philosophie',
    'economie',
    'culture',
];

describe('thème clair', () => {
    it.each([
        ['ink-900 sur le canevas', clair['ink-900'], clair['craie-50'], 4.5],
        ['ink-600 sur le canevas', clair['ink-600'], clair['craie-50'], 4.5],
        [
            'ink-600 sur craie-100 (onglets, survols)',
            clair['ink-600'],
            clair['craie-100'],
            4.5,
        ],
        ['ink-600 sur une carte', clair['ink-600'], clair.card, 4.5],
        [
            'ink-500 sur une carte (aide, indication)',
            clair['ink-500'],
            clair.card,
            4.5,
        ],
        ['ink-500 sur le canevas', clair['ink-500'], clair['craie-50'], 4.5],
        [
            'bordure de contrôle ink-400 sur une carte',
            clair['ink-400'],
            clair.card,
            3,
        ],
        [
            'blanc sur nimba-600 (action dominante)',
            BLANC,
            couleur('nimba-600'),
            4.5,
        ],
        [
            'blanc sur nimba-700 (survol du bouton principal)',
            BLANC,
            couleur('nimba-700'),
            4.5,
        ],
        [
            "nimba-600 sur le canevas (mot coloré d'un grand titre, ≥ 24 px)",
            couleur('nimba-600'),
            clair['craie-50'],
            3,
        ],
        [
            'nimba-700 sur le canevas (lien, libellé)',
            couleur('nimba-700'),
            clair['craie-50'],
            4.5,
        ],
        [
            'nimba-700 sur une carte (libellé sur teinte)',
            couleur('nimba-700'),
            clair.card,
            4.5,
        ],
        ['lien sur une carte', clair.lien, clair.card, 4.5],
        [
            'ink-900 sur soleil-400',
            clair['ink-900'],
            couleur('soleil-400'),
            4.5,
        ],
        ['juste-600 sur une carte', couleur('juste-600'), clair.card, 4.5],
        ['faux-600 sur une carte', couleur('faux-600'), clair.card, 4.5],
        ['indice-600 sur une carte', couleur('indice-600'), clair.card, 4.5],
        [
            'blanc sur juste-600 (bouton succès)',
            BLANC,
            couleur('juste-600'),
            4.5,
        ],
        [
            'blanc sur faux-600 (bouton destructif)',
            BLANC,
            couleur('faux-600'),
            4.5,
        ],
    ])('%s ≥ %d:1', (_, texte, fond, minimum) => {
        expect(contraste(texte, fond)).toBeGreaterThanOrEqual(minimum);
    });

    it.each(MATIERES)(
        'matière %s : nuances 600 et 700 lisibles sur une carte',
        (matiere) => {
            expect(
                contraste(couleur(`${matiere}-600`), clair.card),
            ).toBeGreaterThanOrEqual(4.5);
            expect(
                contraste(couleur(`${matiere}-700`), clair.card),
            ).toBeGreaterThanOrEqual(4.5);
        },
    );
});

describe('thème sombre', () => {
    it.each([
        ['ink-900 sur le canevas', sombre['ink-900'], sombre['craie-50'], 4.5],
        ['ink-600 sur le canevas', sombre['ink-600'], sombre['craie-50'], 4.5],
        ['ink-600 sur craie-100', sombre['ink-600'], sombre['craie-100'], 4.5],
        ['ink-600 sur une carte', sombre['ink-600'], sombre.card, 4.5],
        ['ink-500 sur une carte', sombre['ink-500'], sombre.card, 4.5],
        ['ink-900 sur le relief', sombre['ink-900'], sombre.relief, 4.5],
        [
            'nimba-400 sur une carte (accent en sombre)',
            couleur('nimba-400'),
            sombre.card,
            4.5,
        ],
        [
            'bordure de contrôle ink-400 sur une carte',
            sombre['ink-400'],
            sombre.card,
            3,
        ],
        [
            'nimba-300 sur une carte (accent en sombre)',
            couleur('nimba-300'),
            sombre.card,
            4.5,
        ],
        ['lien sur une carte', sombre.lien, sombre.card, 4.5],
        ['juste-400 sur une carte', couleur('juste-400'), sombre.card, 4.5],
        ['faux-400 sur une carte', couleur('faux-400'), sombre.card, 4.5],
        ['indice-400 sur une carte', couleur('indice-400'), sombre.card, 4.5],
        [
            'canevas sombre sur nimba-300 (pastille choisie)',
            sombre['craie-50'],
            couleur('nimba-300'),
            4.5,
        ],
    ])('%s ≥ %d:1', (_, texte, fond, minimum) => {
        expect(contraste(texte, fond)).toBeGreaterThanOrEqual(minimum);
    });

    it.each(MATIERES)(
        'matière %s : nuance 300 lisible sur une carte sombre',
        (matiere) => {
            expect(
                contraste(couleur(`${matiere}-300`), sombre.card),
            ).toBeGreaterThanOrEqual(4.5);
        },
    );
});

describe('valeurs de DESIGN.md § 2', () => {
    it('reprend les valeurs imposées', () => {
        expect(couleur('nimba-500')).toBe('#f6641b');
        expect(couleur('nimba-600')).toBe('#d04904');
        expect(couleur('nimba-700')).toBe('#a63d02');
        expect(couleur('soleil-400')).toBe('#ffc21a');
        expect(clair['ink-900']).toBe('#1e1814');
        expect(sombre['ink-900']).toBe('#f8f4f1');
    });
});
