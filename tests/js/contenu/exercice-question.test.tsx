import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ExerciceQuestion } from '@/components/questions/exercice-question';
import type { QuestionEleve } from '@/lib/contenu/questions';

const paragraphe = (texte: string) => ({
    type: 'doc' as const,
    content: [
        {
            type: 'paragraph' as const,
            content: [{ type: 'text' as const, text: texte }],
        },
    ],
});

function question(champs: Partial<QuestionEleve>): QuestionEleve {
    return {
        uuid: '0192f3a4-5b6c-7d8e-9f01-23456789abcd',
        version: 1,
        type: 'qcm_une',
        enonce: paragraphe('Énoncé'),
        donnees: {},
        attendue: {},
        indices: [],
        corrige: [{ titre: 'Calculer', blocs: paragraphe('Le corrigé.') }],
        est_exemple: false,
        matiere: 'maths',
        matiere_nom: 'Mathématiques',
        notion: 'Pythagore',
        ...champs,
    };
}

const verifier = () =>
    fireEvent.click(screen.getByRole('button', { name: 'Vérifier' }));

/*
 * L'exercice joué sur place (mini-question, aperçu) : chaque type se saisit,
 * « Vérifier » n'est permis qu'une réponse complète donnée, et le verdict
 * porte toujours **icône + mot + couleur** (DESIGN.md § 2.3).
 */
describe('ExerciceQuestion', () => {
    afterEach(cleanup);

    it('QCM : juste, puis le corrigé', () => {
        render(
            <ExerciceQuestion
                question={question({
                    donnees: {
                        options: [
                            { id: 'a', texte: '4 cm' },
                            { id: 'b', texte: '5 cm' },
                        ],
                    },
                    attendue: { option: 'b' },
                })}
            />,
        );

        expect(
            (
                screen.getByRole('button', {
                    name: 'Vérifier',
                }) as HTMLButtonElement
            ).disabled,
        ).toBe(true);
        fireEvent.click(screen.getByRole('radio', { name: /5 cm/ }));
        verifier();

        expect(screen.getByText('Juste !')).toBeTruthy();
        expect(screen.getByText('Calculer')).toBeTruthy();
    });

    it('QCM à plusieurs réponses : une sur deux donne « En partie juste »', () => {
        render(
            <ExerciceQuestion
                question={question({
                    type: 'qcm_plusieurs',
                    donnees: {
                        options: [
                            { id: 'a', texte: '3' },
                            { id: 'b', texte: '−3' },
                            { id: 'c', texte: '9' },
                        ],
                    },
                    attendue: { options: ['a', 'b'] },
                })}
            />,
        );

        fireEvent.click(screen.getByRole('checkbox', { name: /^A/ }));
        verifier();

        expect(screen.getByText('En partie juste')).toBeTruthy();
        expect(screen.getByText('50 %')).toBeTruthy();
    });

    it('numérique : virgule acceptée, unité affichée, valeur attendue montrée si faux', () => {
        render(
            <ExerciceQuestion
                question={question({
                    type: 'numerique',
                    donnees: { unite: 'cm' },
                    attendue: { valeur: 10, tolerance: 0, relative: false },
                })}
            />,
        );

        fireEvent.change(screen.getByLabelText('Ta réponse'), {
            target: { value: '9,5' },
        });
        verifier();

        expect(screen.getByText('Pas encore')).toBeTruthy();
        expect(screen.getByText('Réponse attendue :').textContent).toContain(
            '10 cm',
        );
    });

    it('texte à trous : un trou libre et une liste', () => {
        render(
            <ExerciceQuestion
                question={question({
                    type: 'trous',
                    donnees: {
                        segments: [
                            { texte: 'Le ' },
                            { trou: 't1' },
                            { texte: ' est ' },
                            { trou: 't2', choix: ['droit', 'aigu'] },
                        ],
                    },
                    attendue: { trous: { t1: ['côté'], t2: ['droit'] } },
                })}
            />,
        );

        fireEvent.change(screen.getByLabelText('Trou 1'), {
            target: { value: 'Coté' },
        });
        fireEvent.change(screen.getByLabelText('Trou 2'), {
            target: { value: 'droit' },
        });
        verifier();

        expect(screen.getByText('Juste !')).toBeTruthy();
    });

    it('remise en ordre : les flèches déplacent, la correction marque chaque rang', () => {
        render(
            <ExerciceQuestion
                question={question({
                    type: 'ordre',
                    donnees: {
                        elements: [
                            { id: 'e2', texte: 'Deux' },
                            { id: 'e1', texte: 'Un' },
                        ],
                    },
                    attendue: { ordre: ['e1', 'e2'] },
                })}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Monter « Un »' }));
        verifier();

        expect(screen.getByText('Juste !')).toBeTruthy();
        expect(screen.getAllByText('juste')).toHaveLength(2);
    });

    it('appariement : une liste par élément de gauche', () => {
        render(
            <ExerciceQuestion
                question={question({
                    type: 'appariement',
                    donnees: {
                        gauche: [
                            { id: 'g1', texte: 'Tension' },
                            { id: 'g2', texte: 'Intensité' },
                        ],
                        droite: [
                            { id: 'd1', texte: 'Ampère' },
                            { id: 'd2', texte: 'Volt' },
                        ],
                    },
                    attendue: { paires: { g1: 'd2', g2: 'd1' } },
                })}
            />,
        );

        fireEvent.change(screen.getByLabelText('Ce qui va avec « Tension »'), {
            target: { value: 'd2' },
        });
        fireEvent.change(
            screen.getByLabelText('Ce qui va avec « Intensité »'),
            {
                target: { value: 'd2' },
            },
        );
        verifier();

        expect(screen.getByText('En partie juste')).toBeTruthy();
        expect(screen.getByText('Attendu :').textContent).toContain('Ampère');
    });

    it('les indices s’ouvrent un par un et se figent après « Vérifier »', () => {
        render(
            <ExerciceQuestion
                question={question({
                    type: 'vrai_faux',
                    attendue: { valeur: true },
                    indices: [paragraphe('Premier'), paragraphe('Second')],
                })}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: /Un indice/ }));
        expect(screen.getByText('Premier')).toBeTruthy();
        expect(screen.queryByText('Second')).toBeNull();

        fireEvent.click(screen.getByRole('radio', { name: /Vrai/ }));
        verifier();
        expect(
            screen.queryByRole('button', { name: /autre indice/ }),
        ).toBeNull();
    });

    it('question ouverte : « À toi d’évaluer », puis le score du barème', () => {
        render(
            <ExerciceQuestion
                question={question({
                    type: 'ouverte',
                    donnees: {
                        bareme: [
                            {
                                id: 'c1',
                                critere: 'Je cite la règle.',
                                points: 1,
                            },
                            {
                                id: 'c2',
                                critere: 'Je donne un exemple.',
                                points: 3,
                            },
                        ],
                    },
                })}
            />,
        );

        fireEvent.change(screen.getByLabelText('Ta rédaction'), {
            target: { value: 'Ma rédaction.' },
        });
        verifier();
        expect(screen.getByText('À toi d’évaluer')).toBeTruthy();

        fireEvent.click(
            screen.getByRole('checkbox', { name: /Je donne un exemple/ }),
        );
        fireEvent.click(
            screen.getByRole('button', { name: 'Valider mon auto-évaluation' }),
        );

        expect(screen.getByText('En partie juste')).toBeTruthy();
        expect(screen.getByText('75 %')).toBeTruthy();
    });
});
