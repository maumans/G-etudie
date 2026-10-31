import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const enregistrer = vi.fn();

vi.mock('@/lib/hors-ligne', () => ({
    enregistrer: (geste: unknown) => enregistrer(geste),
}));

vi.mock('sonner', () => ({
    toast: { success: vi.fn(), error: vi.fn() },
}));

const { SignalerErreur, MOTIFS_SIGNALEMENT } =
    await import('@/components/signaler-erreur');
const { formaterDuree, formaterPoids, questionsDuSujet } =
    await import('@/lib/contenu/sujets');

/*
 * « Signaler une erreur » (lot 4) : le signalement part par la file
 * (`signalement.creer`, priorité 3), avec la version vue ; rien ne part
 * sans motif.
 */
describe('SignalerErreur', () => {
    beforeEach(() => enregistrer.mockReset().mockResolvedValue('uuid'));
    afterEach(cleanup);

    it('part par la file, avec le motif, la version et le message nettoyé', async () => {
        render(
            <SignalerErreur
                cible="question"
                uuid="0192f3a4-5b6c-7d8e-9f01-23456789abcd"
                version={2}
            />,
        );

        fireEvent.click(
            screen.getByRole('button', { name: 'Signaler une erreur' }),
        );
        const envoyer = screen.getByRole('button', {
            name: 'Envoyer le signalement',
        });
        expect((envoyer as HTMLButtonElement).disabled).toBe(true);

        fireEvent.click(
            screen.getByRole('radio', { name: /Le corrigé est faux/ }),
        );
        fireEvent.change(screen.getByRole('textbox'), {
            target: { value: '  Il manque l’unité.  ' },
        });
        fireEvent.click(envoyer);

        await waitFor(() => expect(enregistrer).toHaveBeenCalledTimes(1));
        expect(enregistrer).toHaveBeenCalledWith({
            type: 'signalement.creer',
            charge: {
                cible: 'question',
                uuid: '0192f3a4-5b6c-7d8e-9f01-23456789abcd',
                version: 2,
                motif: 'corrige',
                message: 'Il manque l’unité.',
            },
            priorite: 3,
        });
    });

    it('un message vide part comme null', async () => {
        render(<SignalerErreur cible="lecon" uuid="u" />);

        fireEvent.click(
            screen.getByRole('button', { name: 'Signaler une erreur' }),
        );
        fireEvent.click(screen.getByRole('radio', { name: /Autre chose/ }));
        fireEvent.click(
            screen.getByRole('button', { name: 'Envoyer le signalement' }),
        );

        await waitFor(() => expect(enregistrer).toHaveBeenCalledTimes(1));
        expect(enregistrer.mock.calls[0][0].charge).toMatchObject({
            cible: 'lecon',
            version: null,
            message: null,
        });
    });

    it('cinq motifs, dans l’ordre du serveur', () => {
        expect(MOTIFS_SIGNALEMENT.map((m) => m.valeur)).toEqual([
            'enonce',
            'corrige',
            'reponse_refusee',
            'incomprehensible',
            'autre',
        ]);
    });
});

describe('sujets', () => {
    it('numérote les questions dans l’ordre du sujet, parties comprises', () => {
        const q = (uuid: string) => ({ uuid }) as never;
        const liste = questionsDuSujet({
            parties: [
                { uuid: 'p1', questions: [q('a'), q('b')] },
                { uuid: 'p2', questions: [] },
                { uuid: 'p3', questions: [q('c')] },
            ],
        } as never);

        expect(liste.map((e) => [e.numero, e.partie.uuid])).toEqual([
            [1, 'p1'],
            [2, 'p1'],
            [3, 'p3'],
        ]);
    });

    it('annonce le poids et la durée en français', () => {
        expect(formaterPoids(512)).toBe('1 Ko');
        expect(formaterPoids(1_572_864)).toBe('1,5 Mo');
        expect(formaterPoids(null)).toBe('');
        expect(formaterDuree(45)).toBe('45 min');
        expect(formaterDuree(120)).toBe('2 h');
        expect(formaterDuree(150)).toBe('2 h 30');
        expect(formaterDuree(null)).toBeNull();
    });
});
