import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ContenuBlocs } from '@/components/contenu/contenu-blocs';
import type { DocumentBlocs } from '@/lib/contenu/blocs';
import exemples from '../../fixtures/blocs.json';

const lecon = exemples.find((e) => e.nom === 'leçon complète')!
    .doc as DocumentBlocs;

describe('ContenuBlocs', () => {
    it('affiche titres, mise en forme, formules, encadrés et listes', () => {
        const { container } = render(<ContenuBlocs doc={lecon} />);

        expect(
            screen.getByRole('heading', {
                level: 2,
                name: 'Le théorème de Pythagore',
            }),
        ).toBeTruthy();
        expect(container.querySelector('strong em')?.textContent).toBe(
            ' toujours.',
        );
        // Trois formules, chacune avec son MathML pour les lecteurs d'écran.
        expect(
            container.querySelectorAll('[data-slot="formule"]'),
        ).toHaveLength(3);
        expect(container.querySelectorAll('math')).toHaveLength(3);
        expect(screen.getByText('À retenir').closest('aside')).toBeTruthy();
        expect(container.querySelector('ol')?.getAttribute('start')).toBe('1');
        expect(container.querySelector('ol ul li')).toBeTruthy();
        expect(container.querySelector('br')).toBeTruthy();
    });

    it('affiche un document vide sans erreur', () => {
        const { container } = render(<ContenuBlocs doc={{ type: 'doc' }} />);

        expect(
            container.querySelector('[data-slot="contenu-blocs"]')?.children,
        ).toHaveLength(0);
    });

    it("écrit le texte tel quel, sans l'interpréter comme du HTML", () => {
        const { container } = render(
            <ContenuBlocs
                doc={{
                    type: 'doc',
                    content: [
                        {
                            type: 'paragraph',
                            content: [
                                {
                                    type: 'text',
                                    text: '<img src=x onerror=alert(1)>',
                                },
                            ],
                        },
                    ],
                }}
            />,
        );

        expect(container.querySelector('img')).toBeNull();
        expect(container.textContent).toContain('<img src=x onerror=alert(1)>');
    });
});
