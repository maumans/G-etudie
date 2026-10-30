import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type OptionsReload = {
    only: string[];
    onSuccess?: (page: { props: Record<string, unknown> }) => void;
    onFinish?: () => void;
};

const reload = vi.fn<(options: OptionsReload) => void>();

vi.mock('@inertiajs/react', () => ({ router: { reload } }));

const { useDonneeOptionnelle } = await import('@/hooks/use-donnee-optionnelle');

/** Termine le dernier rechargement partiel comme le ferait Inertia. */
function terminer(props: Record<string, unknown> | null) {
    const options = reload.mock.lastCall![0];

    act(() => {
        if (props !== null) {
            options.onSuccess?.({ props });
        }

        options.onFinish?.();
    });
}

describe('useDonneeOptionnelle', () => {
    beforeEach(() => reload.mockReset());
    afterEach(() => cleanup());

    it('est prête tout de suite si la prop est déjà là, sans requête', () => {
        const { result } = renderHook(() => useDonneeOptionnelle('avis', [1]));

        expect(result.current.etat).toBe('pret');
        expect(reload).not.toHaveBeenCalled();
    });

    it('demande la prop seule, une fois, et passe à prêt quand elle arrive', () => {
        const { result, rerender } = renderHook(() =>
            useDonneeOptionnelle('avis', undefined),
        );
        rerender();

        expect(result.current.etat).toBe('chargement');
        expect(reload).toHaveBeenCalledTimes(1);
        expect(reload.mock.lastCall![0].only).toEqual(['avis']);

        terminer({ avis: [1, 2] });
        expect(result.current.etat).toBe('pret');
    });

    it('une réponse 200 sans la prop demandée est un échec', () => {
        const { result } = renderHook(() =>
            useDonneeOptionnelle('avis', undefined),
        );

        terminer({ autre: true });
        expect(result.current.etat).toBe('echec');
    });

    it('une requête qui échoue conclut quand même, en échec, jamais en chargement sans fin', () => {
        const { result } = renderHook(() =>
            useDonneeOptionnelle('avis', undefined),
        );

        terminer(null);
        expect(result.current.etat).toBe('echec');
    });

    it('recharger() relance la demande après un échec', () => {
        const { result } = renderHook(() =>
            useDonneeOptionnelle('avis', undefined),
        );
        terminer(null);

        act(() => result.current.recharger());
        expect(result.current.etat).toBe('chargement');
        expect(reload).toHaveBeenCalledTimes(2);

        terminer({ avis: [] });
        expect(result.current.etat).toBe('pret');
    });
});
