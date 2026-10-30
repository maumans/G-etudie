import { describe, expect, it } from 'vitest';
import { formaterTelephone, normaliserTelephone } from '@/lib/telephone';
import exemples from '../fixtures/telephones.json';

// Même jeu d'exemples que App\Support\Telephone (tests/Unit/TelephoneTest.php).
describe('normaliserTelephone', () => {
    it.each(exemples)('« $saisie » → $normalise', ({ saisie, normalise }) => {
        expect(normaliserTelephone(saisie)).toBe(normalise);
    });
});

describe('formaterTelephone', () => {
    it('groupe les chiffres au fil de la frappe : 3, puis 2 par 2', () => {
        expect(formaterTelephone('6')).toBe('6');
        expect(formaterTelephone('6221')).toBe('622 1');
        expect(formaterTelephone('622123')).toBe('622 12 3');
        expect(formaterTelephone('622123456')).toBe('622 12 34 56');
    });

    it("ignore ce qui n'est pas un chiffre et coupe à 9 chiffres", () => {
        expect(formaterTelephone('622-12-34-56-78')).toBe('622 12 34 56');
    });
});
