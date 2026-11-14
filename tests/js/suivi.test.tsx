import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { echeanceRelative } from '@/lib/dates';
import type { User } from '@/types';

/*
 * Lot 11 : l'échéance d'un devoir dite en jours de Conakry, les notions
 * faibles d'une classe, l'onglet « Parents » de « Mon compte ».
 */

let utilisateur: User;

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({
        url: '/compte/parents',
        props: { auth: { user: utilisateur } },
    }),
    Head: () => null,
    Link: ({
        href,
        children,
        prefetch: _p,
        preserveScroll: _s,
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
const { ListeNotionsFaibles } = await import('@/components/suivi/elements');

describe('echeanceRelative', () => {
    const maintenant = '2026-11-13T19:00:00Z';

    it('compte en jours du calendrier, pas en tranches de 24 h', () => {
        expect(echeanceRelative('2026-11-13T23:59:59Z', maintenant)).toBe(
            'aujourd’hui',
        );
        expect(echeanceRelative('2026-11-14T08:00:00Z', maintenant)).toBe(
            'demain',
        );
        expect(echeanceRelative('2026-11-18T23:59:59Z', maintenant)).toBe(
            'dans 5 jours',
        );
    });

    it('dit une échéance passée', () => {
        expect(echeanceRelative('2026-11-12T23:59:59Z', maintenant)).toBe(
            'hier',
        );
        expect(echeanceRelative('2026-11-10T10:00:00Z', maintenant)).toBe(
            'il y a 3 jours',
        );
    });
});

describe('ListeNotionsFaibles', () => {
    afterEach(cleanup);

    it('donne la matière, la maîtrise moyenne, les fragiles et ceux qui ne l’ont jamais travaillée', () => {
        render(
            <ListeNotionsFaibles
                total={6}
                notions={[
                    {
                        notion_id: 1,
                        notion: 'Le théorème de Thalès',
                        chapitre: 'Géométrie',
                        matiere: 'Mathématiques',
                        cle: 'maths',
                        moyenne: 30,
                        travaillee_par: 4,
                        fragiles: 3,
                        jamais: 2,
                    },
                ]}
            />,
        );

        expect(screen.getByText('Le théorème de Thalès')).toBeTruthy();
        expect(
            screen.getByRole('progressbar', { name: /maîtrise moyenne 30 %/ }),
        ).toBeTruthy();
        expect(screen.getByText('3 élèves fragiles')).toBeTruthy();
        expect(
            screen.getByText(/2 élèves ne l’ont jamais travaillée/),
        ).toBeTruthy();
    });

    it('la version compacte (cartes de l’accueil) se contente du nom et du pourcentage', () => {
        render(
            <ListeNotionsFaibles
                compacte
                total={6}
                notions={[
                    {
                        notion_id: 1,
                        notion: 'Factoriser',
                        chapitre: 'Algèbre',
                        matiere: 'Mathématiques',
                        cle: 'maths',
                        moyenne: 12,
                        travaillee_par: 1,
                        fragiles: 1,
                        jamais: 5,
                    },
                ]}
            />,
        );

        expect(screen.getByText('Factoriser')).toBeTruthy();
        expect(screen.queryByRole('progressbar')).toBeNull();
    });
});

describe('Onglet « Parents » de Mon compte', () => {
    afterEach(cleanup);

    const compte = (permissions: User['permissions']): User => ({
        id: 1,
        prenom: 'Aïssatou',
        pseudo: 'aissatou',
        numero_verifie: true,
        espace: 'eleve',
        espaces: ['eleve'],
        double_authentification: false,
        permissions,
    });

    it('apparaît pour l’élève, qui donne le code', () => {
        utilisateur = compte(['espace.eleve', 'parents.inviter']);
        render(<EnteteCompte titre="Parents" />);

        expect(screen.getByRole('link', { name: 'Parents' })).toBeTruthy();
    });

    it('n’apparaît pas pour un parent', () => {
        utilisateur = {
            ...compte(['espace.parent']),
            espace: 'parent',
            espaces: ['parent'],
        };
        render(<EnteteCompte titre="Profil" />);

        expect(screen.queryByRole('link', { name: 'Parents' })).toBeNull();
    });
});
