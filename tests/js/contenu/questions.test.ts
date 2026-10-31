import { describe, expect, it } from 'vitest';
import { encadresDe } from '@/lib/contenu/blocs';
import type { DocumentBlocs } from '@/lib/contenu/blocs';
import { corriger } from '@/lib/contenu/questions';
import type { TypeQuestion } from '@/lib/contenu/questions';
import exemples from '../../fixtures/questions.json';

describe("correction sur l'appareil", () => {
    // Même jeu que tests/Unit/FormatQuestionTest.php : le serveur fait foi,
    // l'appareil doit afficher le même verdict.
    it.each(exemples.corrections)('$nom', (exemple) => {
        expect(
            corriger(
                exemple.type as TypeQuestion,
                exemple.attendue,
                exemple.reponse as Record<string, unknown>,
            ),
        ).toBe(exemple.correcte);
    });
});

describe('fiche de révision', () => {
    it("rassemble les encadrés d'un genre, dans l'ordre du document", () => {
        const paragraphe = (texte: string) => ({
            type: 'paragraph' as const,
            content: [{ type: 'text' as const, text: texte }],
        });
        const doc: DocumentBlocs = {
            type: 'doc',
            content: [
                paragraphe('Introduction'),
                {
                    type: 'encadre',
                    attrs: { genre: 'a_retenir' },
                    content: [paragraphe('Premier')],
                },
                {
                    type: 'encadre',
                    attrs: { genre: 'piege' },
                    content: [paragraphe('Piège')],
                },
                {
                    type: 'encadre',
                    attrs: { genre: 'a_retenir' },
                    content: [paragraphe('Second')],
                },
            ],
        };

        expect(encadresDe(doc, 'a_retenir').map((e) => e.content[0])).toEqual([
            paragraphe('Premier'),
            paragraphe('Second'),
        ]);
        expect(encadresDe({ type: 'doc' }, 'a_retenir')).toEqual([]);
    });
});
