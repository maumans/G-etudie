import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Choix } from '@/components/ui/choix';
import {
    ConfirmProvider,
    useConfirmer,
} from '@/components/ui/confirm-provider';
import type { OptionsConfirmation } from '@/components/ui/confirm-provider';
import { pagesAffichees } from '@/components/ui/pagination';
import { ZoneDonnee } from '@/components/ui/zone-donnee';

afterEach(() => cleanup());

describe('pagesAffichees', () => {
    it('montre la première, la dernière, la courante et ses voisines', () => {
        expect(pagesAffichees(1, 1)).toEqual([1]);
        expect(pagesAffichees(1, 3)).toEqual([1, 2, 3]);
        expect(pagesAffichees(6, 12)).toEqual([1, '…', 5, 6, 7, '…', 12]);
        expect(pagesAffichees(12, 12)).toEqual([1, '…', 11, 12]);
    });
});

describe('confirmer()', () => {
    function Demandeur({
        options,
        surReponse,
    }: {
        options: OptionsConfirmation;
        surReponse: (r: boolean) => void;
    }) {
        const confirmer = useConfirmer();

        return (
            <button
                type="button"
                onClick={async () => surReponse(await confirmer(options))}
            >
                Demander
            </button>
        );
    }

    async function demander(boutonClique: string) {
        const surReponse = vi.fn();
        render(
            <ConfirmProvider>
                <Demandeur
                    options={{
                        titre: 'Abandonner cette réponse ?',
                        action: 'Abandonner',
                        ton: 'danger',
                    }}
                    surReponse={surReponse}
                />
            </ConfirmProvider>,
        );

        fireEvent.click(screen.getByText('Demander'));
        expect(await screen.findByRole('alertdialog')).toBeTruthy();
        expect(screen.getByText('Abandonner cette réponse ?')).toBeTruthy();

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: boutonClique }));
        });

        return surReponse;
    }

    it('résout à vrai quand on confirme', async () => {
        expect(await demander('Abandonner')).toHaveBeenCalledWith(true);
    });

    it('résout à faux quand on annule', async () => {
        expect(await demander('Annuler')).toHaveBeenCalledWith(false);
    });

    it("refuse d'être appelé hors de ConfirmProvider", () => {
        const erreur = vi.spyOn(console, 'error').mockImplementation(() => {});
        expect(() =>
            render(
                <Demandeur
                    options={{ titre: 'x', action: 'y' }}
                    surReponse={() => {}}
                />,
            ),
        ).toThrow(/ConfirmProvider/);
        erreur.mockRestore();
    });
});

describe('ZoneDonnee', () => {
    it('annonce le chargement sans afficher le contenu', () => {
        render(
            <ZoneDonnee etat="chargement" onReessayer={() => {}}>
                <p>Contenu</p>
            </ZoneDonnee>,
        );

        expect(screen.getByRole('status').textContent).toContain('Chargement');
        expect(screen.queryByText('Contenu')).toBeNull();
    });

    it("en cas d'échec, propose de réessayer", () => {
        const onReessayer = vi.fn();
        render(
            <ZoneDonnee etat="echec" onReessayer={onReessayer}>
                <p>Contenu</p>
            </ZoneDonnee>,
        );

        expect(screen.getByRole('alert')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
        expect(onReessayer).toHaveBeenCalledTimes(1);
        expect(
            screen.getByRole('button', { name: 'Recharger la page' }),
        ).toBeTruthy();
    });

    it('affiche le contenu une fois prêt', () => {
        render(
            <ZoneDonnee etat="pret" onReessayer={() => {}}>
                <p>Contenu</p>
            </ZoneDonnee>,
        );

        expect(screen.getByText('Contenu')).toBeTruthy();
    });
});

describe('Choix', () => {
    it('porte le verdict par un mot, pas par la couleur seule', () => {
        render(
            <>
                <Choix lettre="A" etat="juste">
                    Réponse A
                </Choix>
                <Choix lettre="B" etat="faux">
                    Réponse B
                </Choix>
                <Choix lettre="C" etat="bonne_reponse">
                    Réponse C
                </Choix>
            </>,
        );

        expect(screen.getByText('Juste')).toBeTruthy();
        expect(screen.getByText('Pas encore')).toBeTruthy();
        expect(screen.getByText('Bonne réponse')).toBeTruthy();
    });

    it('est un bouton radio coché une fois sélectionné, et ne bouge plus après vérification', () => {
        const onChoisir = vi.fn();
        const { rerender } = render(
            <Choix lettre="A" etat="neutre" onChoisir={onChoisir}>
                Réponse A
            </Choix>,
        );

        const option = screen.getByRole('radio');
        expect(option.getAttribute('aria-checked')).toBe('false');
        fireEvent.click(option);
        expect(onChoisir).toHaveBeenCalledTimes(1);

        rerender(
            <Choix lettre="A" etat="juste" onChoisir={onChoisir}>
                Réponse A
            </Choix>,
        );
        expect(screen.getByRole('radio').getAttribute('aria-checked')).toBe(
            'true',
        );
        expect((screen.getByRole('radio') as HTMLButtonElement).disabled).toBe(
            true,
        );
    });
});
