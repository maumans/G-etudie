import { Editor } from '@tiptap/react';
import { afterEach, describe, expect, it } from 'vitest';
import { extensionsLecon } from '@/components/editeur/extensions';
import { erreurBlocs } from '@/lib/contenu/blocs';
import type { DocumentBlocs } from '@/lib/contenu/blocs';
import exemples from '../../fixtures/blocs.json';

let editeur: Editor | null = null;

function editer(contenu: DocumentBlocs | string): Editor {
    editeur = new Editor({
        extensions: extensionsLecon({ vues: false }),
        content: contenu,
    });

    return editeur;
}

afterEach(() => {
    editeur?.destroy();
    editeur = null;
});

const lecon = exemples.find((e) => e.nom === 'leçon complète')!
    .doc as DocumentBlocs;

/**
 * L'éditeur ne doit produire que des documents que le serveur accepte
 * (App\Support\BlocsContenu) : sinon un rédacteur perdrait son travail à
 * l'enregistrement.
 */
describe('éditeur de leçon', () => {
    it('relit une leçon et la rend telle quelle, valide', () => {
        const sortie = editer(lecon).getJSON();

        expect(erreurBlocs(sortie)).toBeNull();
        expect(JSON.stringify(sortie)).toContain('a^2 + b^2 = c^2');
        expect(sortie.content?.map((bloc) => bloc.type)).toEqual(
            lecon.content?.map((bloc) => bloc.type),
        );
    });

    it('écarte au collage ce que le format refuse (souligné, lien, image, code, titre 1)', () => {
        const sortie = editer(
            '<h1>Titre</h1><p><u>souligné</u> <a href="https://exemple.org">lien</a> <s>barré</s> <code>x</code></p><img src="x.png"><blockquote>citation</blockquote><pre>code</pre><hr><h4>petit</h4>',
        ).getJSON();

        expect(erreurBlocs(sortie)).toBeNull();
        expect(JSON.stringify(sortie)).not.toMatch(
            /"type":"(underline|link|strike|image|codeBlock|blockquote|horizontalRule|code)"/,
        );
    });

    it('insère formules et encadrés dans le format attendu', () => {
        const e = editer({ type: 'doc', content: [{ type: 'paragraph' }] });

        e.chain()
            .focus()
            .insertContent({ type: 'formule', attrs: { latex: '\\pi' } })
            .insertContent({ type: 'formuleBloc', attrs: { latex: 'x^2' } })
            .run();
        e.chain()
            .setTextSelection(1)
            .wrapIn('encadre', { genre: 'piege' })
            .run();

        const sortie = e.getJSON();

        expect(erreurBlocs(sortie)).toBeNull();
        expect(JSON.stringify(sortie)).toContain('"genre":"piege"');
        expect(JSON.stringify(sortie)).toContain('"latex":"\\\\pi"');
    });

    it('un document vide reste valide', () => {
        expect(
            erreurBlocs(editer({ type: 'doc', content: [] }).getJSON()),
        ).toBeNull();
    });
});
