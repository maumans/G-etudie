import { Placeholder } from '@tiptap/extensions';
import { mergeAttributes, Node, ReactNodeViewRenderer } from '@tiptap/react';
import type { Extensions, ReactNodeViewProps } from '@tiptap/react';
import type { ComponentType } from 'react';
import StarterKit from '@tiptap/starter-kit';
import type { GenreEncadre } from '@/lib/contenu/blocs';
import { GENRES_ENCADRE } from '@/lib/contenu/blocs';
import { VueEncadre, VueFormule } from './vues';

/**
 * Une demande d'édition de formule, envoyée par la vue d'un nœud à la page
 * (qui ouvre le dialogue). `appliquer` remplace le code, `supprimer` retire
 * le nœud.
 */
export type DemandeFormule = {
    latex: string;
    bloc: boolean;
    appliquer: (latex: string) => void;
    supprimer?: () => void;
};

export type OptionsFormule = {
    ouvrir: (demande: DemandeFormule) => void;
};

function attributLatex() {
    return {
        latex: {
            default: '',
            parseHTML: (element: HTMLElement) =>
                element.getAttribute('data-latex') ?? '',
            renderHTML: (attributs: { latex: string }) => ({
                'data-latex': attributs.latex,
            }),
        },
    };
}

/** Formule dans la ligne (`formule`, App\Support\BlocsContenu). */
const FormuleEnLigne = Node.create<OptionsFormule>({
    name: 'formule',
    group: 'inline',
    inline: true,
    atom: true,
    selectable: true,
    addOptions: () => ({ ouvrir: () => {} }),
    addAttributes: attributLatex,
    parseHTML: () => [{ tag: 'span[data-formule]' }],
    renderHTML: ({ HTMLAttributes }) => [
        'span',
        mergeAttributes(HTMLAttributes, { 'data-formule': '' }),
    ],
});

/** Formule centrée sur sa ligne (`formuleBloc`). */
const FormuleBloc = Node.create<OptionsFormule>({
    name: 'formuleBloc',
    group: 'block',
    atom: true,
    selectable: true,
    addOptions: () => ({ ouvrir: () => {} }),
    addAttributes: attributLatex,
    parseHTML: () => [{ tag: 'div[data-formule-bloc]' }],
    renderHTML: ({ HTMLAttributes }) => [
        'div',
        mergeAttributes(HTMLAttributes, { 'data-formule-bloc': '' }),
    ],
});

/**
 * Encadré « À retenir », « Méthode », « Exemple résolu » ou « Piège
 * fréquent » : des blocs simples, jamais un encadré dans un encadré.
 */
const Encadre = Node.create({
    name: 'encadre',
    group: 'block',
    content: '(paragraph|heading|bulletList|orderedList|formuleBloc)+',
    defining: true,
    addAttributes: () => ({
        genre: {
            default: 'a_retenir' satisfies GenreEncadre,
            parseHTML: (element: HTMLElement) => {
                const genre = element.getAttribute('data-genre');

                return GENRES_ENCADRE.includes(genre as GenreEncadre)
                    ? genre
                    : 'a_retenir';
            },
            renderHTML: (attributs: { genre: string }) => ({
                'data-genre': attributs.genre,
            }),
        },
    }),
    parseHTML: () => [{ tag: 'aside[data-encadre]' }],
    renderHTML: ({ HTMLAttributes }) => [
        'aside',
        mergeAttributes(HTMLAttributes, { 'data-encadre': '' }),
        0,
    ],
});

/**
 * Les extensions de l'éditeur de leçon : exactement les nœuds du format des
 * blocs (`lib/contenu/blocs.ts`). Tout ce qui n'y figure pas (souligné,
 * lien, citation, code, image collée…) est écarté à la saisie comme au
 * collage. `vues` : les vues React des nœuds (absentes des tests sans DOM
 * React).
 */
export function extensionsLecon({
    ouvrirFormule = () => {},
    vues = true,
    placeholder = 'Écrivez la leçon…',
}: {
    ouvrirFormule?: (demande: DemandeFormule) => void;
    vues?: boolean;
    placeholder?: string;
} = {}): Extensions {
    const avecVue = <T extends Node<OptionsFormule> | Node>(
        noeud: T,
        vue: ComponentType<ReactNodeViewProps<HTMLElement>>,
    ) =>
        vues
            ? noeud.extend({
                  addNodeView: () => ReactNodeViewRenderer<HTMLElement>(vue),
              })
            : noeud;

    return [
        StarterKit.configure({
            heading: { levels: [2, 3] },
            blockquote: false,
            code: false,
            codeBlock: false,
            horizontalRule: false,
            strike: false,
            underline: false,
            link: false,
        }),
        Placeholder.configure({ placeholder }),
        avecVue(FormuleEnLigne, VueFormule).configure({
            ouvrir: ouvrirFormule,
        }),
        avecVue(FormuleBloc, VueFormule).configure({ ouvrir: ouvrirFormule }),
        avecVue(Encadre, VueEncadre),
    ];
}
