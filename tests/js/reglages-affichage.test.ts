import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
    initialiserReglagesAffichage,
    TAILLES_LECTURE,
    useReglagesAffichage,
} from '@/hooks/use-reglages-affichage';

describe("réglages d'affichage (locaux au téléphone)", () => {
    beforeEach(() => {
        localStorage.clear();
        document.documentElement.removeAttribute('style');
        initialiserReglagesAffichage();
    });

    it('part de la taille normale (17 px) sans économie de données', () => {
        const { result } = renderHook(() => useReglagesAffichage());

        expect(result.current.taille).toBe('normale');
        expect(result.current.economieDonnees).toBe(false);
        expect(
            document.documentElement.style.getPropertyValue('--taille-lecture'),
        ).toBe(TAILLES_LECTURE.normale);
    });

    it('applique la taille choisie au document et la garde après un redémarrage', () => {
        const { result } = renderHook(() => useReglagesAffichage());

        act(() => result.current.changerTaille('grande'));

        expect(
            document.documentElement.style.getPropertyValue('--taille-lecture'),
        ).toBe('1.1875rem');

        document.documentElement.removeAttribute('style');
        initialiserReglagesAffichage();
        expect(
            document.documentElement.style.getPropertyValue('--taille-lecture'),
        ).toBe('1.1875rem');
    });

    it('garde le mode économie de données et le signale au document', () => {
        const { result } = renderHook(() => useReglagesAffichage());

        act(() => result.current.changerEconomieDonnees(true));

        expect(result.current.economieDonnees).toBe(true);
        expect(document.documentElement.dataset.economieDonnees).toBe('oui');
        expect(localStorage.getItem('nkaramogo:economie-donnees')).toBe('1');
    });
});
