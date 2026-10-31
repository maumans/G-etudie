import { describe, expect, it } from 'vitest';
import { encadresDe } from '@/lib/contenu/blocs';
import type { DocumentBlocs } from '@/lib/contenu/blocs';
import {
    corriger,
    lireNombre,
    normaliserTexte,
    scoreAutoEvaluation,
    verdictDe,
} from '@/lib/contenu/questions';
import type { DonneesQuestion } from '@/lib/contenu/questions';
import type { TypeQuestion } from '@/lib/contenu/questions';
import exemples from '../../fixtures/questions.json';

describe("correction sur l'appareil", () => {
    // Même jeu que tests/Unit/FormatQuestionTest.php : le serveur fait foi,
    // l'appareil doit afficher le même score.
    it.each(exemples.corrections)('$nom', (exemple) => {
        expect(
            corriger(
                exemple.type as TypeQuestion,
                exemple.attendue as Record<string, unknown>,
                exemple.reponse as Record<string, unknown>,
            ),
        ).toBe(exemple.score);
    });

    it.each(exemples.auto_evaluations)('auto-évaluation : $nom', (exemple) => {
        expect(
            scoreAutoEvaluation(
                exemple.donnees as DonneesQuestion,
                exemple.criteres,
            ),
        ).toBe(exemple.score);
    });

    it('normalise les textes comme le serveur', () => {
        for (const [texte, attendu] of exemples.normalisations) {
            expect(normaliserTexte(texte as string), texte as string).toBe(
                attendu,
            );
        }
    });

    it('lit les nombres comme le serveur', () => {
        for (const [texte, attendu] of exemples.nombres) {
            expect(lireNombre(texte), String(texte)).toBe(attendu);
        }
    });

    it('juste seulement à 100 ; en partie entre les deux', () => {
        expect(verdictDe(100)).toBe('juste');
        expect(verdictDe(66)).toBe('partiel');
        expect(verdictDe(0)).toBe('faux');
        expect(verdictDe(null)).toBe('a_evaluer');
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
