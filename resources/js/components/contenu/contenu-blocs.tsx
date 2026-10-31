import {
    BookmarkCheck,
    Lightbulb,
    ListChecks,
    TriangleAlert,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Formule } from '@/components/ui/formule';
import type {
    Bloc,
    DocumentBlocs,
    ElementDeListe,
    GenreEncadre,
    NoeudEnLigne,
} from '@/lib/contenu/blocs';
import { cn } from '@/lib/utils';

/**
 * Affiche un contenu (leçon, corrigé…) à partir de ses blocs
 * (`lib/contenu/blocs.ts`), sans savoir d'où il vient : props Inertia, pack
 * hors ligne ou aperçu de l'éditeur (HORS_LIGNE.md A.4). Ne charge jamais
 * l'éditeur. Texte en taille de lecture (17 px, réglable par l'élève).
 *
 * Une mini-question (`question`) n'est rendue que si l'écran fournit
 * `rendreQuestion` (la leçon de l'élève, l'aperçu du back-office) : la
 * question vient de l'objet de contenu, pas du document.
 */
export function ContenuBlocs({
    doc,
    className,
    rendreQuestion,
}: {
    doc: DocumentBlocs;
    className?: string;
    rendreQuestion?: (uuid: string) => ReactNode;
}) {
    return (
        <div
            data-slot="contenu-blocs"
            className={cn(
                'grid gap-4 text-lecture [overflow-wrap:anywhere] text-ink-900',
                className,
            )}
        >
            {(doc.content ?? []).map((bloc, rang) => (
                <BlocRendu
                    key={rang}
                    bloc={bloc}
                    rendreQuestion={rendreQuestion}
                />
            ))}
        </div>
    );
}

export const ENCADRES: Record<
    GenreEncadre,
    { titre: string; icone: LucideIcon; cadre: string; tete: string }
> = {
    a_retenir: {
        titre: 'À retenir',
        icone: BookmarkCheck,
        cadre: 'border-nimba-500/35 bg-nimba-500/[0.07] dark:border-nimba-400/30 dark:bg-nimba-400/[0.08]',
        tete: 'text-nimba-700 dark:text-nimba-300',
    },
    methode: {
        titre: 'Méthode',
        icone: ListChecks,
        cadre: 'border-ink-900/15 bg-craie-100/70 dark:border-white/10 dark:bg-white/[0.04]',
        tete: 'text-ink-900',
    },
    exemple: {
        titre: 'Exemple résolu',
        icone: Lightbulb,
        cadre: 'border-border bg-card dark:bg-white/[0.02]',
        tete: 'text-ink-600',
    },
    piege: {
        titre: 'Piège fréquent',
        icone: TriangleAlert,
        cadre: 'border-soleil-500/45 bg-soleil-400/[0.12] dark:border-soleil-400/30 dark:bg-soleil-400/[0.08]',
        tete: 'text-soleil-700 dark:text-soleil-300',
    },
};

function BlocRendu({
    bloc,
    rendreQuestion,
}: {
    bloc: Bloc;
    rendreQuestion?: (uuid: string) => ReactNode;
}) {
    switch (bloc.type) {
        case 'question':
            return rendreQuestion?.(bloc.attrs.uuid) ?? null;
        case 'paragraph':
            return (
                <p className="leading-[1.65]">
                    <EnLigne noeuds={bloc.content} />
                </p>
            );
        case 'heading':
            return bloc.attrs.level === 2 ? (
                <h2 className="mt-2 text-[1.25rem] leading-snug font-semibold">
                    <EnLigne noeuds={bloc.content} />
                </h2>
            ) : (
                <h3 className="mt-1 text-[1.0625rem] leading-snug font-semibold">
                    <EnLigne noeuds={bloc.content} />
                </h3>
            );
        case 'bulletList':
            return (
                <ul className="grid list-disc gap-1.5 pl-6 marker:text-ink-500">
                    <Elements elements={bloc.content} />
                </ul>
            );
        case 'orderedList':
            return (
                <ol
                    start={bloc.attrs?.start}
                    className="grid list-decimal gap-1.5 pl-6 marker:font-semibold marker:text-ink-600"
                >
                    <Elements elements={bloc.content} />
                </ol>
            );
        case 'formuleBloc':
            return <Formule latex={bloc.attrs.latex} bloc />;
        case 'encadre': {
            const style = ENCADRES[bloc.attrs.genre];

            return (
                <aside
                    className={cn(
                        'grid gap-3 rounded-carte border px-4 py-3.5',
                        style.cadre,
                    )}
                >
                    <p
                        className={cn(
                            'flex items-center gap-2 text-aide font-semibold',
                            style.tete,
                        )}
                    >
                        <style.icone aria-hidden className="size-4" />
                        {style.titre}
                    </p>
                    {bloc.content.map((enfant, rang) => (
                        <BlocRendu key={rang} bloc={enfant} />
                    ))}
                </aside>
            );
        }
    }
}

function Elements({ elements }: { elements: ElementDeListe[] }) {
    return elements.map((element, rang) => (
        <li key={rang} className="pl-1 [&>ol]:mt-1.5 [&>ul]:mt-1.5">
            {element.content.map((enfant, position) =>
                enfant.type === 'paragraph' ? (
                    <EnLigne key={position} noeuds={enfant.content} />
                ) : (
                    <BlocRendu key={position} bloc={enfant} />
                ),
            )}
        </li>
    ));
}

function EnLigne({ noeuds = [] }: { noeuds?: NoeudEnLigne[] }): ReactNode {
    return noeuds.map((noeud, rang) => {
        switch (noeud.type) {
            case 'hardBreak':
                return <br key={rang} />;
            case 'formule':
                return <Formule key={rang} latex={noeud.attrs.latex} />;
            case 'text': {
                let rendu: ReactNode = noeud.text;
                const marques = (noeud.marks ?? []).map((m) => m.type);

                if (marques.includes('italic')) {
                    rendu = <em>{rendu}</em>;
                }

                if (marques.includes('bold')) {
                    rendu = <strong className="font-semibold">{rendu}</strong>;
                }

                return <span key={rang}>{rendu}</span>;
            }
        }
    });
}
