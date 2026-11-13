import { describe, expect, it } from 'vitest';
import { estDocumentValide } from '@/lib/contenu/blocs';
import { texteEnBlocs } from '@/lib/tuteur/texte';

// Lot 10 : le texte du tuteur s'affiche comme une leçon (ContenuBlocs).
describe('texteEnBlocs', () => {
    it('sépare les paragraphes et rend les formules en ligne', () => {
        const doc = texteEnBlocs(
            'Reprenons.\n\nOn a $a^2 + b^2 = c^2$, donc $c = 5$.',
        );

        expect(doc.content).toEqual([
            {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Reprenons.' }],
            },
            {
                type: 'paragraph',
                content: [
                    { type: 'text', text: 'On a ' },
                    { type: 'formule', attrs: { latex: 'a^2 + b^2 = c^2' } },
                    { type: 'text', text: ', donc ' },
                    { type: 'formule', attrs: { latex: 'c = 5' } },
                    { type: 'text', text: '.' },
                ],
            },
        ]);
    });

    it('une formule seule sur sa ligne est centrée', () => {
        expect(texteEnBlocs('$$v = \\frac{d}{t}$$').content).toEqual([
            { type: 'formuleBloc', attrs: { latex: 'v = \\frac{d}{t}' } },
        ]);
    });

    it('reconnaît les étapes numérotées et les puces', () => {
        const doc = texteEnBlocs(
            '1. On repère $a$.\n2. On calcule.\n\n- un\n- deux',
        );

        expect(doc.content?.[0]).toMatchObject({ type: 'orderedList' });
        expect(doc.content?.[0]).not.toHaveProperty('attrs');
        expect(doc.content?.[1]).toMatchObject({ type: 'bulletList' });
        expect(doc.content?.[1]).toMatchObject({
            content: [{ type: 'listItem' }, { type: 'listItem' }],
        });
    });

    it('pendant le flux, un $ sans son jumeau reste du texte', () => {
        expect(texteEnBlocs('On a $a^2 + b').content).toEqual([
            {
                type: 'paragraph',
                content: [{ type: 'text', text: 'On a $a^2 + b' }],
            },
        ]);
    });

    it('un saut de ligne simple reste un saut de ligne', () => {
        expect(texteEnBlocs('Ligne 1\nLigne 2').content).toEqual([
            {
                type: 'paragraph',
                content: [
                    { type: 'text', text: 'Ligne 1' },
                    { type: 'hardBreak' },
                    { type: 'text', text: 'Ligne 2' },
                ],
            },
        ]);
    });

    it('donne toujours un document valide, même vide ou à moitié écrit', () => {
        for (const texte of [
            '',
            '   ',
            '$$ $$',
            'a $ b $$ c',
            '1. seul',
            'EXEMPLE — texte.\n\n$$x$$\n\n- a',
        ]) {
            expect(estDocumentValide(texteEnBlocs(texte))).toBe(true);
        }
    });
});
