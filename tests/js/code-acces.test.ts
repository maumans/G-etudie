import { describe, expect, it } from 'vitest';
import {
    ALPHABET,
    cleDeControle,
    diagnostic,
    grouper,
    normaliser,
} from '@/lib/code-acces';
import exemples from '../fixtures/codes-acces.json';

// Même jeu d'exemples que App\Support\CodeAcces (tests/Unit/CodeAccesFormatTest.php).
describe('normaliser', () => {
    it.each(exemples.valides)(
        '« $saisie » → $normalise',
        ({ saisie, normalise }) => {
            expect(normaliser(saisie)).toBe(normalise);
        },
    );

    it.each(exemples.mal_tapes)('« %s » est refusé', (saisie) => {
        expect(normaliser(saisie)).toBeNull();
    });

    it('voit toute faute sur un seul caractère', () => {
        const code = exemples.valides[0].normalise;

        for (let rang = 0; rang < 12; rang++) {
            for (const autre of ALPHABET) {
                if (autre !== code[rang]) {
                    const faux =
                        code.slice(0, rang) + autre + code.slice(rang + 1);
                    expect(normaliser(faux)).toBeNull();
                }
            }
        }
    });
});

describe('saisie', () => {
    it('groupe par quatre au fil de la frappe et coupe à 12', () => {
        expect(grouper('k7r')).toBe('K7R');
        expect(grouper('k7rd2')).toBe('K7RD-2');
        expect(grouper('K7RD-2MXQ 9HP3XYZ')).toBe('K7RD-2MXQ-9HP3');
    });

    it('dit ce qui ne va pas, sans jargon', () => {
        expect(diagnostic('K7RD0')).toContain('ni « 0 » ni « O »');
        expect(diagnostic('K7RDI')).toContain('ni « 1 » ni « I »');
        expect(diagnostic('K7RD')).toBe('Encore 8 caractères.');
        const bon = exemples.valides[0].normalise;
        expect(diagnostic(bon)).toBeNull();
        const faux = bon.slice(0, 11) + (bon[11] === 'A' ? 'B' : 'A');
        expect(diagnostic(faux)).toBe(
            'Ce code est mal tapé : vérifie chaque caractère.',
        );
    });

    it('la clé de contrôle est un caractère de l’alphabet', () => {
        expect(ALPHABET).toContain(cleDeControle('ABCDEFGHJKL'));
    });
});
