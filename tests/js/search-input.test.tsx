import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DELAI_RECHERCHE_MS, SearchInput } from '@/components/ui/search-input';

describe('SearchInput', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        cleanup();
        vi.useRealTimers();
    });

    function monter() {
        const onRecherche = vi.fn();
        render(<SearchInput libelle="Rechercher" onRecherche={onRecherche} />);

        return {
            onRecherche,
            champ: screen.getByRole('searchbox') as HTMLInputElement,
        };
    }

    it('met le champ à jour tout de suite et lance la recherche 350 ms après la dernière frappe', () => {
        const { onRecherche, champ } = monter();

        fireEvent.change(champ, { target: { value: 'pro' } });
        expect(champ.value).toBe('pro');
        act(() => {
            vi.advanceTimersByTime(200);
        });
        fireEvent.change(champ, { target: { value: 'proba' } });
        act(() => {
            vi.advanceTimersByTime(DELAI_RECHERCHE_MS - 1);
        });
        expect(onRecherche).not.toHaveBeenCalled();

        act(() => {
            vi.advanceTimersByTime(1);
        });
        expect(onRecherche).toHaveBeenCalledTimes(1);
        expect(onRecherche).toHaveBeenCalledWith('proba');
    });

    it('lance tout de suite sur Entrée, sans relancer à la fin du délai', () => {
        const { onRecherche, champ } = monter();

        fireEvent.change(champ, { target: { value: 'suites' } });
        fireEvent.keyDown(champ, { key: 'Enter' });
        expect(onRecherche).toHaveBeenCalledWith('suites');

        act(() => {
            vi.advanceTimersByTime(DELAI_RECHERCHE_MS * 2);
        });
        expect(onRecherche).toHaveBeenCalledTimes(1);
    });

    it('vide le champ sur Échap et relance la recherche à vide', () => {
        const { onRecherche, champ } = monter();

        fireEvent.change(champ, { target: { value: 'suites' } });
        fireEvent.keyDown(champ, { key: 'Enter' });
        fireEvent.keyDown(champ, { key: 'Escape' });

        expect(champ.value).toBe('');
        expect(onRecherche).toHaveBeenLastCalledWith('');
    });

    it('vide le champ avec la croix et relance la recherche à vide', () => {
        const { onRecherche, champ } = monter();

        fireEvent.change(champ, { target: { value: 'suites' } });
        fireEvent.keyDown(champ, { key: 'Enter' });
        fireEvent.click(
            screen.getByRole('button', { name: 'Effacer la recherche' }),
        );

        expect(champ.value).toBe('');
        expect(onRecherche).toHaveBeenLastCalledWith('');
    });

    it('ne relance rien pour une valeur identique à la dernière recherche', () => {
        const { onRecherche, champ } = monter();

        fireEvent.change(champ, { target: { value: 'suites' } });
        fireEvent.keyDown(champ, { key: 'Enter' });
        fireEvent.change(champ, { target: { value: 'suite' } });
        fireEvent.change(champ, { target: { value: 'suites' } });
        act(() => {
            vi.advanceTimersByTime(DELAI_RECHERCHE_MS);
        });

        expect(onRecherche).toHaveBeenCalledTimes(1);
    });
});
