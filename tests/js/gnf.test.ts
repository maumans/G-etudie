import { describe, expect, it } from 'vitest';
import { formaterGnf, formaterNombre, lireNombre } from '@/lib/utils';
import exemples from '../fixtures/gnf.json';

// Même jeu d'exemples que tests/Unit/GnfTest.php : PHP et JavaScript doivent
// écrire un montant à l'identique.
describe('formaterGnf', () => {
    it.each(exemples)('$montant → $attendu', ({ montant, attendu }) => {
        expect(formaterGnf(montant)).toBe(attendu);
    });

    it('sépare les milliers par une espace insécable, jamais une espace ordinaire', () => {
        expect(formaterGnf(100000)).not.toContain(' ');
        expect(formaterGnf(100000)).toContain(' ');
    });
});

describe('lireNombre', () => {
    it('relit ce que formaterNombre écrit', () => {
        for (const valeur of [0, 999, 12500, 1234567, 2500.5, 10.25, -7500]) {
            expect(lireNombre(formaterNombre(valeur))).toBe(valeur);
        }
    });

    it('accepte la virgule comme le point', () => {
        expect(lireNombre('13,5')).toBe(13.5);
        expect(lireNombre('13.5')).toBe(13.5);
        expect(lireNombre('12 500')).toBe(12500);
    });

    it('rend null pour une saisie vide ou illisible', () => {
        expect(lireNombre('')).toBeNull();
        expect(lireNombre('12a')).toBeNull();
        expect(lireNombre('1,2,3')).toBeNull();
    });
});
