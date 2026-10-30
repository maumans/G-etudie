import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { BookOpen, House } from 'lucide-react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const info = vi.fn();

vi.mock('sonner', () => ({ toast: { info } }));
vi.mock('@inertiajs/react', () => ({
    usePage: () => ({ url: '/eleve' }),
    Link: ({
        href,
        children,
        prefetch: _prefetch,
        ...props
    }: {
        href: string;
        children: ReactNode;
        prefetch?: boolean;
    }) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
}));

const { LienNavigation } = await import('@/components/lien-navigation');

describe('LienNavigation', () => {
    afterEach(() => {
        cleanup();
        info.mockReset();
    });

    it("marque l'entrée de la page courante", () => {
        render(
            <LienNavigation
                entree={{ libelle: 'Accueil', icone: House, href: '/eleve' }}
                variante="onglet"
                exact
            />,
        );

        expect(
            screen
                .getByRole('link', { name: 'Accueil' })
                .getAttribute('aria-current'),
        ).toBe('page');
    });

    it("n'est jamais un clic mort : une entrée à venir le dit quand on la touche", () => {
        render(
            <LienNavigation
                entree={{ libelle: 'Cours', icone: BookOpen }}
                variante="onglet"
            />,
        );

        fireEvent.click(
            screen.getByRole('button', { name: 'Cours (bientôt)' }),
        );

        expect(info).toHaveBeenCalledWith(
            '« Cours » arrive bientôt.',
            expect.anything(),
        );
    });
});
