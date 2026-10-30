import { describe, expect, it } from 'vitest';
import {
    erreurBlocs,
    estDocumentValide,
    resumeBlocs,
} from '@/lib/contenu/blocs';
import type { DocumentBlocs } from '@/lib/contenu/blocs';
import exemples from '../../fixtures/blocs.json';

/** Un paragraphe enveloppé dans `n` listes à puces (comme dans BlocsContenuTest). */
function listesImbriquees(n: number): unknown {
    let noeud: unknown = { type: 'paragraph' };

    for (let i = 0; i < n; i++) {
        noeud = {
            type: 'bulletList',
            content: [
                { type: 'listItem', content: [{ type: 'paragraph' }, noeud] },
            ],
        };
    }

    return { type: 'doc', content: [noeud] };
}

// Même jeu d'exemples que tests/Unit/BlocsContenuTest.php : l'appareil et le
// serveur acceptent et refusent les mêmes documents (HORS_LIGNE.md A.4).
describe('format des blocs', () => {
    it.each(exemples)('$nom', ({ doc, valide }) => {
        expect(estDocumentValide(doc), String(erreurBlocs(doc))).toBe(valide);
    });

    it('refuse une formule de plus de 1 000 caractères', () => {
        const formule = (n: number) => ({
            type: 'doc',
            content: [{ type: 'formuleBloc', attrs: { latex: 'é'.repeat(n) } }],
        });

        expect(estDocumentValide(formule(1000))).toBe(true);
        expect(erreurBlocs(formule(1001))).toContain('trop longue');
    });

    it('refuse un contenu de plus de 100 Ko ou trop imbriqué', () => {
        const lourd = {
            type: 'doc',
            content: [
                {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'a'.repeat(100_001) }],
                },
            ],
        };

        expect(erreurBlocs(lourd)).toContain('trop long');
        expect(estDocumentValide(listesImbriquees(2))).toBe(true);
        expect(erreurBlocs(listesImbriquees(4))).toContain('imbriqué');
    });

    it('résume comme le serveur', () => {
        const lecon = exemples.find((e) => e.nom === 'leçon complète')!
            .doc as DocumentBlocs;

        expect(resumeBlocs(lecon)).toEqual({
            mots: 19,
            formules: 3,
            encadres: 1,
        });
    });
});
