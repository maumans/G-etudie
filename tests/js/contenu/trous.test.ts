import { describe, expect, it } from 'vitest';
import { texteVersTrous, trousVersTexte } from '@/lib/contenu/trous';

describe('texte à trous : saisie en une ligne', () => {
    it('lit les trous libres et les listes de choix', () => {
        const { segments, trous } = texteVersTrous(
            'Fanta a [achetées / achetees] des mangues. Elles ont [marchée / *marché / marchées].',
        );

        expect(segments).toEqual([
            { texte: 'Fanta a ' },
            { trou: 't1' },
            { texte: ' des mangues. Elles ont ' },
            { trou: 't2', choix: ['marchée', 'marché', 'marchées'] },
            { texte: '.' },
        ]);
        expect(trous).toEqual({
            t1: ['achetées', 'achetees'],
            t2: ['marché'],
        });
    });

    it('relit ce qu’il a écrit, à l’identique', () => {
        const texte = '[Conakry] est la capitale ; [*vrai / faux] ?';
        const { segments, trous } = texteVersTrous(texte);

        expect(trousVersTexte(segments, trous)).toBe(texte);
    });

    it('un texte sans crochet n’a pas de trou ; un trou vide reste un trou', () => {
        expect(texteVersTrous('Rien ici.').trous).toEqual({});
        expect(texteVersTrous('Un [] trou.').trous).toEqual({ t1: [] });
    });
});
