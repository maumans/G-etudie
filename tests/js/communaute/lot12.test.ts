import { afterEach, describe, expect, it } from 'vitest';
import {
    cleBrouillon,
    compteur,
    ecrireBrouillon,
    effacerBrouillon,
    lireBrouillon,
} from '@/lib/communaute/brouillon';
import { texteCarteCulture } from '@/lib/culture/carte';
import type { RessourceEleve } from '@/lib/ressources';
import { avertissementsSortie, poidsAnnonce } from '@/lib/ressources';

/*
 * Lot 12 : brouillon du fil (rien ne se perd), annonce du poids d'une
 * ressource externe et dialogue de sortie, texte de la carte de partage.
 */

afterEach(() => window.localStorage.clear());

describe('brouillon du fil', () => {
    it('garde le texte par auteur, groupe et question, et l’efface après l’envoi', () => {
        const cle = cleBrouillon(12, 7, null);
        const reponse = cleBrouillon(12, 7, 'f3c1');

        ecrireBrouillon(cle, 'Comment trouver l’hypoténuse ?');
        ecrireBrouillon(reponse, 'C’est le plus long côté.');

        expect(lireBrouillon(cle)).toBe('Comment trouver l’hypoténuse ?');
        expect(lireBrouillon(reponse)).toBe('C’est le plus long côté.');
        expect(lireBrouillon(cleBrouillon(12, 8, null))).toBe('');

        effacerBrouillon(cle);
        expect(lireBrouillon(cle)).toBe('');
        expect(lireBrouillon(reponse)).toBe('C’est le plus long côté.');
    });

    it('un texte vide ne laisse rien ; un stockage indisponible n’échoue pas', () => {
        const cle = cleBrouillon(1, 1, null);
        ecrireBrouillon(cle, '   ');
        expect(window.localStorage.getItem(cle)).toBeNull();

        const original = Object.getOwnPropertyDescriptor(
            window,
            'localStorage',
        );
        Object.defineProperty(window, 'localStorage', {
            configurable: true,
            get() {
                throw new Error('bloqué');
            },
        });

        try {
            expect(() => ecrireBrouillon(cle, 'texte')).not.toThrow();
            expect(lireBrouillon(cle)).toBe('');
        } finally {
            if (original) {
                Object.defineProperty(window, 'localStorage', original);
            }
        }
    });

    it('compte les caractères comme le serveur (points de code), alerte près de la limite', () => {
        expect(compteur('  abc  ', 500)).toEqual({
            libelle: '3 / 500',
            alerte: false,
            trop: false,
        });
        expect(compteur('é'.repeat(460), 500).alerte).toBe(true);
        expect(compteur('x'.repeat(501), 500).trop).toBe(true);
    });
});

const RESSOURCE: RessourceEleve = {
    uuid: 'r1',
    titre: 'Le théorème de Pythagore',
    url: 'https://fr.wikipedia.org/wiki/Pythagore',
    domaine: 'wikipedia.org',
    site: 'Wikipédia',
    type: 'encyclopedie',
    type_libelle: 'Encyclopédie',
    description: null,
    poids_ko: 900,
    duree_minutes: null,
    avec_suggestions: false,
    est_exemple: false,
};

describe('ressources externes', () => {
    it('annonce le poids en Ko ou en Mo, à la virgule', () => {
        expect(poidsAnnonce(900)).toBe('≈ 900 Ko');
        expect(poidsAnnonce(1500)).toBe('≈ 1,5 Mo');
        expect(poidsAnnonce(9600)).toBe('≈ 9,6 Mo');
        expect(poidsAnnonce(48000)).toBe('≈ 48 Mo');
        expect(poidsAnnonce(0)).toBe('≈ 1 Ko');
    });

    it('le dialogue de sortie nomme le site et le coût ; une vidéo YouTube prévient des suggestions', () => {
        expect(avertissementsSortie(RESSOURCE)).toEqual([
            'Ce lien ouvre Wikipédia (wikipedia.org), un site qui n’est pas N’karamögö.',
            'Il consommera environ 900 Ko de données.',
        ]);

        const video = avertissementsSortie({
            ...RESSOURCE,
            site: 'YouTube',
            domaine: 'youtube.com',
            type: 'video',
            poids_ko: 9600,
            duree_minutes: 6,
            avec_suggestions: true,
        });

        expect(video[1]).toBe(
            'Une vidéo consomme beaucoup de données : ≈ 9,6 Mo pour 6 min. Le Wi-Fi est préférable.',
        );
        expect(video[2]).toMatch(/autres vidéos et des publicités/);
    });
});

describe('carte de partage du quiz', () => {
    it('ne porte que le prénom et le score', () => {
        expect(
            texteCarteCulture({
                prenom: 'Aïssatou',
                justes: 4,
                total: 5,
                exemple: false,
            }),
        ).toBe(
            'Aïssatou a eu 4/5 au quiz de culture générale sur N’karamögö. Et toi, tu fais mieux ?',
        );
    });
});
