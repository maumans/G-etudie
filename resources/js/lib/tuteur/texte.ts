import type {
    Bloc,
    DocumentBlocs,
    ElementDeListe,
    NoeudEnLigne,
} from '@/lib/contenu/blocs';

/**
 * Le texte du tuteur (lot 10) en blocs, pour qu'il s'affiche avec
 * `ContenuBlocs` comme une leçon : formules KaTeX, listes, paragraphes.
 * Même écriture que `App\Support\TexteEnBlocs` et que les consignes du
 * tuteur (`App\Services\Tuteur\Consignes`) :
 *
 *  - une ligne vide sépare deux paragraphes ;
 *  - `$$…$$` seul sur sa ligne : formule centrée ; `$…$` : formule en ligne ;
 *  - « - » ou « • » en début de ligne : liste à puces ; « 1. » : numérotée.
 *
 * Pendant le flux, le texte est incomplet : un `$` sans son jumeau reste du
 * texte jusqu'à ce que la formule se ferme (jamais de formule à moitié
 * écrite envoyée à KaTeX).
 */
const LATEX_MAX = 1000;

export function texteEnBlocs(texte: string): DocumentBlocs {
    const propre = texte.replace(/\r\n?/g, '\n').trim();

    if (propre === '') {
        return { type: 'doc', content: [] };
    }

    const blocs: Bloc[] = [];

    for (const morceau of propre.split(/\n\s*\n/)) {
        blocs.push(...paragraphe(morceau.trim()));
    }

    return { type: 'doc', content: blocs };
}

function paragraphe(morceau: string): Bloc[] {
    if (morceau === '') {
        return [];
    }

    const centree = /^\$\$([\s\S]+?)\$\$$/.exec(morceau);

    if (centree && latexAccepte(centree[1])) {
        return [{ type: 'formuleBloc', attrs: { latex: centree[1].trim() } }];
    }

    const lignes = morceau.split('\n');
    const puce = /^\s*[-•]\s+/;
    const numero = /^\s*\d{1,3}[.)]\s+/;

    if (lignes.every((l) => puce.test(l))) {
        return [{ type: 'bulletList', content: elements(lignes, puce) }];
    }

    if (lignes.every((l) => numero.test(l))) {
        const depart = Number.parseInt(lignes[0], 10);

        return [
            {
                type: 'orderedList',
                ...(depart > 1 ? { attrs: { start: depart } } : {}),
                content: elements(lignes, numero),
            },
        ];
    }

    const contenu: NoeudEnLigne[] = [];

    lignes.forEach((ligne, rang) => {
        if (rang > 0) {
            contenu.push({ type: 'hardBreak' });
        }

        contenu.push(...enLigne(ligne));
    });

    return [{ type: 'paragraph', content: contenu }];
}

function elements(lignes: string[], motif: RegExp): ElementDeListe[] {
    return lignes.map((ligne) => ({
        type: 'listItem',
        content: [
            { type: 'paragraph', content: enLigne(ligne.replace(motif, '')) },
        ],
    }));
}

/** Une ligne : texte et formules `$…$` (les `$$…$$` en ligne aussi). */
export function enLigne(ligne: string): NoeudEnLigne[] {
    const noeuds: NoeudEnLigne[] = [];
    const motif = /\$\$([^$]+?)\$\$|\$([^$\n]+?)\$/g;
    let reste = 0;

    for (const trouve of ligne.matchAll(motif)) {
        const latex = (trouve[1] ?? trouve[2]).trim();

        if (!latexAccepte(latex)) {
            continue;
        }

        if (trouve.index > reste) {
            noeuds.push({
                type: 'text',
                text: ligne.slice(reste, trouve.index),
            });
        }

        noeuds.push({ type: 'formule', attrs: { latex } });
        reste = trouve.index + trouve[0].length;
    }

    if (reste < ligne.length) {
        noeuds.push({ type: 'text', text: ligne.slice(reste) });
    }

    return noeuds;
}

function latexAccepte(latex: string): boolean {
    return latex.trim() !== '' && latex.length <= LATEX_MAX;
}
