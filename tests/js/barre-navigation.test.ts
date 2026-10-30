import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    brancherBarreNavigation,
    DELAI_AFFICHAGE_MS,
    DELAI_SECOURS_FIN_MS,
    DUREE_DISPARITION_MS,
} from '@/lib/barre-navigation';
import type { RouteurObserve } from '@/lib/barre-navigation';

type Visite = {
    prefetch?: boolean;
    showProgress?: boolean;
    completed?: boolean;
    cancelled?: boolean;
    interrupted?: boolean;
};

/** Faux routeur : émet `before` et `finish` comme Inertia. */
function fauxRouteur() {
    const ecouteurs: Record<string, ((e: never) => void)[]> = {
        before: [],
        finish: [],
    };
    const routeur: RouteurObserve = {
        on(nom, rappel) {
            ecouteurs[nom].push(rappel as (e: never) => void);

            return () => {};
        },
    };
    const emettre = (
        nom: 'before' | 'finish',
        visit: Visite,
        defaultPrevented = false,
    ) =>
        ecouteurs[nom].forEach((rappel) =>
            rappel({ detail: { visit }, defaultPrevented } as never),
        );

    return { routeur, emettre };
}

describe('barre de navigation', () => {
    let images: (() => void)[];
    let emettre: ReturnType<typeof fauxRouteur>['emettre'];

    const barre = () =>
        document.querySelector<HTMLElement>('.barre-navigation');
    const peindre = () => {
        const enAttente = images;
        images = [];
        enAttente.forEach((rappel) => rappel());
    };

    beforeEach(() => {
        vi.useFakeTimers();
        images = [];
        const faux = fauxRouteur();
        emettre = faux.emettre;
        brancherBarreNavigation(faux.routeur, {
            document,
            planifier: (rappel, delai) => setTimeout(rappel, delai),
            annuler: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
            prochaineImage: (rappel) => images.push(rappel),
        });
    });

    afterEach(() => {
        vi.useRealTimers();
        document.body.innerHTML = '';
    });

    it("n'affiche rien pour une visite de moins de 80 ms", () => {
        emettre('before', {});
        vi.advanceTimersByTime(DELAI_AFFICHAGE_MS - 1);
        emettre('finish', { completed: true });
        vi.advanceTimersByTime(1000);
        peindre();

        expect(barre()).toBeNull();
    });

    it("paraît après 80 ms et ne finit qu'une fois la page peinte (double image)", () => {
        emettre('before', {});
        vi.advanceTimersByTime(DELAI_AFFICHAGE_MS);
        expect(barre()?.dataset.etat).toBe('avance');

        emettre('finish', { completed: true });
        expect(barre()?.dataset.etat).toBe('avance');

        peindre();
        expect(barre()?.dataset.etat).toBe('avance');

        peindre();
        expect(barre()?.dataset.etat).toBe('terminee');

        vi.advanceTimersByTime(DUREE_DISPARITION_MS);
        expect(barre()).toBeNull();
    });

    it("se termine quand même si aucune image n'est peinte (onglet en arrière-plan)", () => {
        emettre('before', {});
        vi.advanceTimersByTime(DELAI_AFFICHAGE_MS);
        emettre('finish', { completed: true });

        vi.advanceTimersByTime(DELAI_SECOURS_FIN_MS - 1);
        expect(barre()?.dataset.etat).toBe('avance');

        vi.advanceTimersByTime(1);
        expect(barre()?.dataset.etat).toBe('terminee');

        // Les images peintes ensuite ne relancent pas la fin.
        peindre();
        peindre();
        vi.advanceTimersByTime(DUREE_DISPARITION_MS);
        expect(barre()).toBeNull();
    });

    it("s'efface sans aller au bout sur annulation ou erreur", () => {
        emettre('before', {});
        vi.advanceTimersByTime(DELAI_AFFICHAGE_MS);
        emettre('finish', { completed: false, cancelled: true });

        expect(barre()?.dataset.etat).toBe('abandonnee');
        vi.advanceTimersByTime(DUREE_DISPARITION_MS);
        expect(barre()).toBeNull();
    });

    it('ignore les préchargements et les rechargements en arrière-plan', () => {
        emettre('before', { prefetch: true });
        emettre('before', { showProgress: false });
        vi.advanceTimersByTime(DELAI_AFFICHAGE_MS * 3);

        expect(barre()).toBeNull();
    });

    it('ignore une visite annulée par un écouteur inscrit avant elle', () => {
        emettre('before', {}, true);
        vi.advanceTimersByTime(DELAI_AFFICHAGE_MS * 3);

        expect(barre()).toBeNull();
    });

    it('continue quand une visite est interrompue par une autre', () => {
        emettre('before', {});
        vi.advanceTimersByTime(DELAI_AFFICHAGE_MS);
        emettre('before', {});
        emettre('finish', { interrupted: true });
        peindre();
        peindre();
        expect(barre()?.dataset.etat).toBe('avance');

        emettre('finish', { completed: true });
        peindre();
        peindre();
        expect(barre()?.dataset.etat).toBe('terminee');
    });
});
