import { NodeViewContent, NodeViewWrapper } from '@tiptap/react';
import type { ReactNodeViewProps } from '@tiptap/react';
import { ChevronDown, CircleHelp, Trash2 } from 'lucide-react';
import { ENCADRES } from '@/components/contenu/contenu-blocs';
import { Formule } from '@/components/ui/formule';
import type { GenreEncadre } from '@/lib/contenu/blocs';
import { GENRES_ENCADRE } from '@/lib/contenu/blocs';
import { cn } from '@/lib/utils';
import type { OptionsFormule, OptionsMiniQuestion } from './extensions';

/**
 * Formule dans l'éditeur : rendue comme chez l'élève ; un clic (ou Entrée
 * quand elle est sélectionnée) ouvre le dialogue d'édition du LaTeX.
 */
export function VueFormule({
    node,
    selected,
    extension,
    updateAttributes,
    deleteNode,
}: ReactNodeViewProps) {
    const bloc = node.type.name === 'formuleBloc';
    const latex = String(node.attrs.latex ?? '');
    const { ouvrir } = extension.options as OptionsFormule;

    function editer() {
        ouvrir({
            latex,
            bloc,
            appliquer: (nouveau) => updateAttributes({ latex: nouveau }),
            supprimer: deleteNode,
        });
    }

    return (
        <NodeViewWrapper
            as={bloc ? 'div' : 'span'}
            className={cn(bloc ? 'my-1 block' : 'inline')}
        >
            <button
                type="button"
                contentEditable={false}
                onClick={editer}
                className={cn(
                    'cursor-pointer rounded-[6px] px-0.5 align-middle transition-colors outline-none hover:bg-nimba-500/[0.08] focus-visible:outline-2 focus-visible:outline-ring',
                    bloc ? 'block w-full py-1' : 'inline-block',
                    selected &&
                        'bg-nimba-500/[0.10] ring-2 ring-nimba-500/60 dark:ring-nimba-400/60',
                )}
            >
                {/* Nom lu : « Modifier la formule » puis la formule elle-même
                    (MathML) — le texte visible fait partie du nom (axe). */}
                <span className="sr-only">Modifier la formule : </span>
                {latex.trim() === '' ? (
                    <span className="text-aide text-ink-500">Formule vide</span>
                ) : (
                    <Formule latex={latex} bloc={bloc} />
                )}
            </button>
        </NodeViewWrapper>
    );
}

/** Encadré dans l'éditeur : son genre se change dans son en-tête. */
export function VueEncadre({
    node,
    updateAttributes,
    deleteNode,
}: ReactNodeViewProps) {
    const genre = node.attrs.genre as GenreEncadre;
    const style = ENCADRES[genre] ?? ENCADRES.a_retenir;

    return (
        <NodeViewWrapper
            as="aside"
            className={cn(
                'my-1 grid gap-2 rounded-carte border px-4 py-3',
                style.cadre,
            )}
        >
            <div
                contentEditable={false}
                className="flex items-center justify-between gap-2 select-none"
            >
                <label
                    className={cn(
                        'relative flex items-center gap-2 text-aide font-semibold',
                        style.tete,
                    )}
                >
                    <style.icone aria-hidden className="size-4" />
                    <span className="sr-only">Genre de l’encadré</span>
                    <select
                        value={genre}
                        onChange={(e) =>
                            updateAttributes({ genre: e.target.value })
                        }
                        className="appearance-none rounded-[6px] bg-transparent pr-5 outline-none hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-ring dark:hover:bg-white/5"
                    >
                        {GENRES_ENCADRE.map((g) => (
                            <option key={g} value={g}>
                                {ENCADRES[g].titre}
                            </option>
                        ))}
                    </select>
                    <ChevronDown
                        aria-hidden
                        className="pointer-events-none absolute right-0 size-3.5"
                    />
                </label>
                <button
                    type="button"
                    onClick={deleteNode}
                    aria-label="Retirer l’encadré"
                    className="flex size-7 items-center justify-center rounded-[7px] text-ink-500 transition-colors outline-none hover:bg-faux-600/[0.08] hover:text-faux-600 focus-visible:outline-2 focus-visible:outline-ring"
                >
                    <Trash2 aria-hidden className="size-3.5" />
                </button>
            </div>
            <NodeViewContent className="grid gap-3" />
        </NodeViewWrapper>
    );
}

/** Mini-question dans l'éditeur : une carte qui dit quelle question l'élève recevra. */
export function VueMiniQuestion({
    node,
    selected,
    extension,
    deleteNode,
}: ReactNodeViewProps) {
    const uuid = String(node.attrs.uuid ?? '');
    const question = (extension.options as OptionsMiniQuestion).decrire(uuid);

    return (
        <NodeViewWrapper
            as="div"
            className={cn(
                'my-1 flex items-start gap-3 rounded-carte border border-nimba-500/35 bg-nimba-500/[0.06] px-4 py-3 dark:border-nimba-400/30 dark:bg-nimba-400/[0.08]',
                selected && 'ring-2 ring-nimba-500/60 dark:ring-nimba-400/60',
            )}
        >
            <CircleHelp
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-nimba-700 dark:text-nimba-300"
            />
            <div
                contentEditable={false}
                className="grid min-w-0 flex-1 gap-0.5 select-none"
            >
                <p className="text-aide font-semibold text-nimba-700 dark:text-nimba-300">
                    Mini-question{question ? ` · ${question.type}` : ''}
                </p>
                <p className="line-clamp-2 text-interface text-ink-900">
                    {question?.extrait ??
                        'Question introuvable ou plus publiée : l’élève ne la verra pas.'}
                </p>
            </div>
            <button
                type="button"
                contentEditable={false}
                onClick={deleteNode}
                aria-label="Retirer la mini-question"
                className="flex size-7 shrink-0 items-center justify-center rounded-[7px] text-ink-500 transition-colors outline-none hover:bg-faux-600/[0.08] hover:text-faux-600 focus-visible:outline-2 focus-visible:outline-ring"
            >
                <Trash2 aria-hidden className="size-3.5" />
            </button>
        </NodeViewWrapper>
    );
}
