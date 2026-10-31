import type { SegmentTrous } from '@/lib/contenu/questions';

/**
 * Le texte à trous se saisit en une ligne, au back-office :
 *
 *   « Les mangues que Fanta a [achetées] étaient mûres. Ses amies ont
 *     [marchée / *marché / marchées] jusqu'au marché. »
 *
 *  - entre crochets, un trou ; les formes acceptées séparées par « / » ;
 *  - une étoile devant une forme fait du trou une **liste de choix** :
 *    toutes les formes sont proposées, celles étoilées sont justes.
 *
 * Le format stocké reste celui de `FormatQuestion` (segments + réponses) :
 * ces deux fonctions ne font que l'écrire et le relire.
 */
export function texteVersTrous(texte: string): {
    segments: SegmentTrous[];
    trous: Record<string, string[]>;
} {
    const segments: SegmentTrous[] = [];
    const trous: Record<string, string[]> = {};
    const motif = /\[([^\]]*)\]/g;
    let curseur = 0;
    let numero = 0;

    for (const trouve of texte.matchAll(motif)) {
        const avant = texte.slice(curseur, trouve.index);

        if (avant !== '') {
            segments.push({ texte: avant });
        }

        numero++;
        const id = `t${numero}`;
        const formes = trouve[1]
            .split('/')
            .map((f) => f.trim())
            .filter((f) => f !== '' && f !== '*');
        const etoilees = formes.filter((f) => f.startsWith('*'));

        if (etoilees.length > 0) {
            segments.push({
                trou: id,
                choix: formes.map((f) => f.replace(/^\*\s*/, '')),
            });
            trous[id] = etoilees.map((f) => f.replace(/^\*\s*/, ''));
        } else {
            segments.push({ trou: id });
            trous[id] = formes;
        }

        curseur = trouve.index + trouve[0].length;
    }

    const fin = texte.slice(curseur);

    if (fin !== '') {
        segments.push({ texte: fin });
    }

    return { segments, trous };
}

export function trousVersTexte(
    segments: SegmentTrous[],
    trous: Record<string, string[]>,
): string {
    return segments
        .map((segment) => {
            if (!('trou' in segment)) {
                return segment.texte;
            }

            const justes = trous[segment.trou] ?? [];

            return segment.choix
                ? `[${segment.choix.map((c) => (justes.includes(c) ? `*${c}` : c)).join(' / ')}]`
                : `[${justes.join(' / ')}]`;
        })
        .join('');
}
