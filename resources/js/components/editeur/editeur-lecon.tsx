import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import {
    Bold,
    CircleHelp,
    Heading2,
    Heading3,
    Italic,
    List,
    ListOrdered,
    Pilcrow,
    Redo2,
    Sigma,
    SquareSigma,
    Undo2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { ENCADRES } from '@/components/contenu/contenu-blocs';
import type { DocumentBlocs, GenreEncadre } from '@/lib/contenu/blocs';
import { GENRES_ENCADRE } from '@/lib/contenu/blocs';
import { cn } from '@/lib/utils';
import { DialogueFormule } from './dialogue-formule';
import { DialogueMiniQuestion } from './dialogue-mini-question';
import type { DemandeFormule, QuestionDisponible } from './extensions';
import { extensionsLecon } from './extensions';

/**
 * L'éditeur de leçon (PLAN M17) : TipTap réduit au format des blocs, mis en
 * page comme chez l'élève (taille de lecture, mêmes titres, mêmes
 * encadrés). Chargé seulement par la page d'édition du back-office :
 * l'élève ne télécharge jamais TipTap.
 */
export function EditeurLecon({
    initial,
    onChange,
    libelle,
    compact = false,
    placeholder,
    questions,
}: {
    initial: DocumentBlocs;
    onChange: (doc: DocumentBlocs) => void;
    libelle: string;
    /** Énoncé, indice, étape de corrigé : plus bas, sans titres. */
    compact?: boolean;
    placeholder?: string;
    /** Leçon : les questions publiées qu'on peut y glisser en mini-question. */
    questions?: QuestionDisponible[];
}) {
    const [demande, setDemande] = useState<DemandeFormule | null>(null);
    const [choixQuestion, setChoixQuestion] = useState(false);

    const editeur = useEditor({
        extensions: extensionsLecon({
            ouvrirFormule: setDemande,
            placeholder,
            decrireQuestion: questions
                ? (uuid) => questions.find((q) => q.uuid === uuid)
                : undefined,
        }),
        content: initial,
        immediatelyRender: true,
        editorProps: {
            attributes: {
                'aria-label': libelle,
                'aria-multiline': 'true',
                role: 'textbox',
                class: cn(
                    'outline-none',
                    compact ? 'min-h-[5.5rem]' : 'min-h-[22rem]',
                ),
            },
        },
        onUpdate: ({ editor }) => onChange(editor.getJSON() as DocumentBlocs),
    });

    return (
        <div className="grid">
            <BarreOutils
                editeur={editeur}
                ouvrirFormule={setDemande}
                compact={compact}
                ouvrirQuestions={
                    questions ? () => setChoixQuestion(true) : undefined
                }
            />
            <EditorContent
                editor={editeur}
                className={cn(
                    compact ? 'px-4 py-3' : 'px-5 py-5',
                    'text-lecture [overflow-wrap:anywhere] text-ink-900',
                    // Mise en page de lecture, comme ContenuBlocs.
                    '[&_.ProseMirror>*+*]:mt-4 [&_aside>div>*+*]:mt-3',
                    '[&_p]:leading-[1.65]',
                    '[&_h2]:mt-2 [&_h2]:text-[1.25rem] [&_h2]:leading-snug [&_h2]:font-semibold',
                    '[&_h3]:mt-1 [&_h3]:text-[1.0625rem] [&_h3]:leading-snug [&_h3]:font-semibold',
                    '[&_li]:pl-1 [&_li+li]:mt-1.5 [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6',
                    '[&_ol]:marker:font-semibold [&_ol]:marker:text-ink-600 [&_ul]:marker:text-ink-500',
                    '[&_strong]:font-semibold',
                    // Texte d'invite du premier paragraphe vide.
                    '[&_p.is-editor-empty:first-child]:before:pointer-events-none [&_p.is-editor-empty:first-child]:before:float-left [&_p.is-editor-empty:first-child]:before:h-0 [&_p.is-editor-empty:first-child]:before:text-ink-500 [&_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]',
                )}
            />
            <DialogueFormule
                demande={demande}
                fermer={() => setDemande(null)}
            />
            {questions && (
                <DialogueMiniQuestion
                    ouvert={choixQuestion}
                    fermer={() => setChoixQuestion(false)}
                    questions={questions}
                    inserer={(uuid) =>
                        editeur
                            ?.chain()
                            .focus()
                            .insertContent({
                                type: 'question',
                                attrs: { uuid },
                            })
                            .run()
                    }
                />
            )}
        </div>
    );
}

function BarreOutils({
    editeur,
    ouvrirFormule,
    compact,
    ouvrirQuestions,
}: {
    editeur: Editor | null;
    ouvrirFormule: (demande: DemandeFormule) => void;
    compact: boolean;
    ouvrirQuestions?: () => void;
}) {
    const etat = useEditorState({
        editor: editeur,
        selector: ({ editor }) =>
            editor
                ? {
                      paragraphe: editor.isActive('paragraph'),
                      titre2: editor.isActive('heading', { level: 2 }),
                      titre3: editor.isActive('heading', { level: 3 }),
                      gras: editor.isActive('bold'),
                      italique: editor.isActive('italic'),
                      puces: editor.isActive('bulletList'),
                      numeros: editor.isActive('orderedList'),
                      encadre: editor.isActive('encadre'),
                      annuler: editor.can().undo(),
                      retablir: editor.can().redo(),
                  }
                : null,
    });

    if (!editeur || !etat) {
        return null;
    }

    const chaine = () => editeur.chain().focus();

    function formule(bloc: boolean) {
        ouvrirFormule({
            latex: '',
            bloc,
            appliquer: (latex) =>
                chaine()
                    .insertContent({
                        type: bloc ? 'formuleBloc' : 'formule',
                        attrs: { latex },
                    })
                    .run(),
        });
    }

    function encadrer(genre: GenreEncadre) {
        if (editeur?.isActive('encadre')) {
            chaine().updateAttributes('encadre', { genre }).run();

            return;
        }

        chaine().wrapIn('encadre', { genre }).run();
    }

    return (
        <div
            role="toolbar"
            aria-label="Mise en forme"
            className="sticky top-14 z-10 flex flex-wrap items-center gap-y-0.5 border-b bg-card/95 px-2 py-1.5 backdrop-blur-sm lg:top-0"
        >
            <Outil
                icone={Pilcrow}
                nom="Paragraphe"
                actif={etat.paragraphe && !etat.encadre}
                onClick={() => chaine().setParagraph().run()}
            />
            {!compact && (
                <>
                    <Outil
                        icone={Heading2}
                        nom="Titre"
                        actif={etat.titre2}
                        onClick={() =>
                            chaine().toggleHeading({ level: 2 }).run()
                        }
                    />
                    <Outil
                        icone={Heading3}
                        nom="Sous-titre"
                        actif={etat.titre3}
                        onClick={() =>
                            chaine().toggleHeading({ level: 3 }).run()
                        }
                    />
                </>
            )}
            <Separateur />
            <Outil
                icone={Bold}
                nom="Gras (Ctrl+B)"
                actif={etat.gras}
                onClick={() => chaine().toggleBold().run()}
            />
            <Outil
                icone={Italic}
                nom="Italique (Ctrl+I)"
                actif={etat.italique}
                onClick={() => chaine().toggleItalic().run()}
            />
            <Separateur />
            <Outil
                icone={List}
                nom="Liste à puces"
                actif={etat.puces}
                onClick={() => chaine().toggleBulletList().run()}
            />
            <Outil
                icone={ListOrdered}
                nom="Liste numérotée"
                actif={etat.numeros}
                onClick={() => chaine().toggleOrderedList().run()}
            />
            <Separateur />
            <Outil
                icone={Sigma}
                nom="Formule dans la ligne"
                onClick={() => formule(false)}
            />
            <Outil
                icone={SquareSigma}
                nom="Formule centrée"
                onClick={() => formule(true)}
            />
            <Separateur />
            {GENRES_ENCADRE.map((genre) => (
                <Outil
                    key={genre}
                    icone={ENCADRES[genre].icone}
                    nom={`Encadré « ${ENCADRES[genre].titre} »`}
                    actif={
                        etat.encadre && editeur.isActive('encadre', { genre })
                    }
                    onClick={() => encadrer(genre)}
                />
            ))}
            {ouvrirQuestions && (
                <>
                    <Separateur />
                    <Outil
                        icone={CircleHelp}
                        nom="Mini-question de vérification"
                        onClick={ouvrirQuestions}
                    />
                </>
            )}
            <span className="flex border-l border-border pl-1 sm:ml-auto sm:border-0 sm:pl-0">
                <Outil
                    icone={Undo2}
                    nom="Annuler (Ctrl+Z)"
                    desactive={!etat.annuler}
                    onClick={() => chaine().undo().run()}
                />
                <Outil
                    icone={Redo2}
                    nom="Rétablir (Ctrl+Maj+Z)"
                    desactive={!etat.retablir}
                    onClick={() => chaine().redo().run()}
                />
            </span>
        </div>
    );
}

function Outil({
    icone: Icone,
    nom,
    actif,
    desactive = false,
    onClick,
}: {
    icone: LucideIcon;
    nom: string;
    actif?: boolean;
    desactive?: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            title={nom}
            aria-label={nom}
            aria-pressed={actif}
            disabled={desactive}
            // Garder la sélection de l'éditeur pendant le clic.
            onMouseDown={(e) => e.preventDefault()}
            onClick={onClick}
            className={cn(
                'flex size-9 items-center justify-center rounded-[8px] text-ink-600 transition-colors outline-none hover:bg-craie-100 hover:text-ink-900 focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40 sm:size-8',
                actif && 'bg-ink-900/[0.07] text-ink-900 dark:bg-white/10',
            )}
        >
            <Icone aria-hidden className="size-4" />
        </button>
    );
}

function Separateur() {
    return <span aria-hidden className="mx-1 h-5 w-px bg-border" />;
}
