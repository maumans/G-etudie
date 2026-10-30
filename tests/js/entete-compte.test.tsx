import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@/types';

let utilisateur: User;

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({
        url: '/compte/profil',
        props: { auth: { user: utilisateur } },
    }),
    Head: () => null,
    Link: ({
        href,
        children,
        prefetch: _prefetch,
        preserveScroll: _preserveScroll,
        ...props
    }: {
        href: string;
        children: ReactNode;
        prefetch?: boolean;
        preserveScroll?: boolean;
    }) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
}));

const { EnteteCompte } = await import('@/components/entete-compte');

function compte(modifications: Partial<User>): User {
    return {
        id: 1,
        prenom: 'Aïssatou',
        pseudo: 'aissatou',
        numero_verifie: true,
        espace: 'eleve',
        espaces: ['eleve'],
        double_authentification: false,
        ...modifications,
    };
}

describe('EnteteCompte', () => {
    afterEach(cleanup);

    it("ne montre pas l'onglet Sécurité à un élève, et le tutoie", () => {
        utilisateur = compte({});
        render(<EnteteCompte titre="Profil" />);

        expect(screen.queryByRole('link', { name: 'Sécurité' })).toBeNull();
        expect(screen.getByText(/^Ton profil/)).toBeTruthy();
    });

    it("montre l'onglet Sécurité au personnel, et le vouvoie", () => {
        utilisateur = compte({
            espace: 'contenu',
            espaces: ['contenu'],
            double_authentification: true,
        });
        render(<EnteteCompte titre="Profil" />);

        expect(
            screen.getByRole('link', { name: 'Sécurité' }).getAttribute('href'),
        ).toBe('/compte/securite');
        expect(screen.getByText(/^Votre profil/)).toBeTruthy();
    });
});
