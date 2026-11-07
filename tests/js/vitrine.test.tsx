import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CompteARebours } from '@/components/vitrine/compte-a-rebours';
import { habillageDe } from '@/lib/habillages';
import type { Formule } from '@/lib/vitrine';
import {
    economie,
    formaterDateLongue,
    joursRestants,
    lienWhatsapp,
    prixMensuel,
} from '@/lib/vitrine';
import habillages from '../fixtures/habillages.json';

afterEach(cleanup);

const mensuel: Formule = {
    cle: 'mensuel',
    nom: 'Mensuel',
    prix_gnf: 15000,
    periode: 'par mois',
    mois: 1,
};
const annee: Formule = {
    cle: 'annee',
    nom: 'Année scolaire',
    prix_gnf: 100000,
    periode: 'jusqu’aux examens',
    mois: 10,
};

describe('habillages (même jeu d’exemples que App\\Support\\Habillages)', () => {
    it.each(Object.entries(habillages.exemples))('%s → %s', (page, attendu) => {
        expect(habillageDe(page)).toBe(attendu);
    });
});

describe('compte à rebours', () => {
    it('compte en jours du calendrier, le jour J vaut 0', () => {
        const soir = new Date(2027, 5, 21, 23, 30);
        expect(joursRestants('2027-06-22', soir)).toBe(1);
        expect(joursRestants('2027-06-22', new Date(2027, 5, 22, 0, 5))).toBe(
            0,
        );
        expect(joursRestants('2027-06-22', new Date(2026, 10, 7, 12))).toBe(
            227,
        );
    });

    it('n’affiche que les sessions à venir, et rien sans date', () => {
        const maintenant = new Date(2026, 10, 7, 12);
        const { container } = render(
            <CompteARebours sessions={[]} maintenant={maintenant} />,
        );
        expect(container.innerHTML).toBe('');

        render(
            <CompteARebours
                maintenant={maintenant}
                sessions={[
                    { examen: 'CEE', nom: '', date: '2026-06-01' },
                    { examen: 'BEPC', nom: '', date: '2027-06-22' },
                    { examen: 'BAC', nom: '', date: '2026-11-07' },
                ]}
            />,
        );
        expect(screen.queryByText('CEE')).toBeNull();
        expect(screen.getByText('BEPC')).toBeTruthy();
        expect(screen.getByText('227')).toBeTruthy();
        expect(screen.getByText('Baccalauréat unique')).toBeTruthy();
        expect(screen.getByText('Jour J')).toBeTruthy();
    });

    it('écrit la date en toutes lettres', () => {
        expect(formaterDateLongue('2027-06-22')).toBe('22 juin 2027');
    });
});

describe('tarifs', () => {
    it('donne le prix par mois d’une formule longue, arrondi à la centaine', () => {
        expect(prixMensuel(annee)).toBe('10 000 GNF par mois');
        expect(prixMensuel(mensuel)).toBeNull();
        expect(prixMensuel({ ...annee, prix_gnf: 99990 })).toBe(
            '10 000 GNF par mois',
        );
    });

    it('calcule l’économie par rapport au mois payé chaque mois', () => {
        expect(economie(annee, mensuel)).toBe(33);
        expect(economie(mensuel, mensuel)).toBe(0);
        expect(economie(annee, undefined)).toBe(0);
        expect(economie({ ...annee, prix_gnf: 200000 }, mensuel)).toBe(0);
    });
});

describe('partage WhatsApp', () => {
    it('met le texte puis l’adresse dans le lien wa.me, encodés', () => {
        expect(
            lienWhatsapp('Sujet de Maths, BEPC 2024', 'https://n.gn/sujets/x'),
        ).toBe(
            'https://wa.me/?text=Sujet%20de%20Maths%2C%20BEPC%202024%0Ahttps%3A%2F%2Fn.gn%2Fsujets%2Fx',
        );
    });
});
