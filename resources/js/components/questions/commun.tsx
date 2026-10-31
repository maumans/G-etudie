import { Check, CircleDashed, PenLine, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Formule } from '@/components/ui/formule';
import type { Element, QuestionEleve, Verdict } from '@/lib/contenu/questions';
import type { CleMatiere } from '@/lib/matieres';
import { MATIERES } from '@/lib/matieres';
import { cn } from '@/lib/utils';

/**
 * Les quatre verdicts d'une réponse (DESIGN.md § 2.3) : **icône + mot +
 * couleur**, jamais la couleur seule. « Pas encore » plutôt que « Faux » :
 * on corrige une tentative, pas un élève. « En partie juste » prend la
 * couleur de l'indice (« presque »).
 */
export const VERDICTS: Record<
    Verdict,
    {
        mot: string;
        icone: LucideIcon;
        texte: string;
        pastille: string;
    }
> = {
    juste: {
        mot: 'Juste !',
        icone: Check,
        texte: 'text-juste-700 dark:text-juste-400',
        pastille:
            'bg-juste-600 text-white dark:bg-juste-400 dark:text-[#110e0b]',
    },
    partiel: {
        mot: 'En partie juste',
        icone: CircleDashed,
        texte: 'text-indice-700 dark:text-indice-400',
        pastille:
            'bg-indice-400 text-[#2a1c00] dark:bg-indice-400 dark:text-[#110e0b]',
    },
    faux: {
        mot: 'Pas encore',
        icone: X,
        texte: 'text-faux-600 dark:text-faux-400',
        pastille: 'bg-faux-600 text-white dark:bg-faux-400 dark:text-[#110e0b]',
    },
    a_evaluer: {
        mot: 'À toi d’évaluer',
        icone: PenLine,
        texte: 'text-ink-900',
        pastille: 'bg-ink-900 text-craie-50',
    },
};

/** Le verdict d'une réponse, annoncé aux lecteurs d'écran par la page. */
export function VerdictQuestion({
    verdict,
    score,
    className,
}: {
    verdict: Verdict;
    score: number | null;
    className?: string;
}) {
    const style = VERDICTS[verdict];

    return (
        <p
            className={cn(
                'flex items-center gap-2.5 text-titre-carte font-semibold',
                style.texte,
                className,
            )}
        >
            <span
                aria-hidden
                className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-full',
                    style.pastille,
                )}
            >
                <style.icone className="size-4" strokeWidth={3} />
            </span>
            {style.mot}
            {verdict === 'partiel' && score !== null && (
                <span className="text-aide font-medium text-ink-600 font-data">
                    {score} %
                </span>
            )}
        </p>
    );
}

/** Une partie de réponse corrigée (un trou, une paire, un rang) : icône + couleur + mot lu. */
export function MarquePartie({ juste }: { juste: boolean }) {
    const Icone = juste ? Check : X;

    return (
        <span
            className={cn(
                'flex size-5 shrink-0 items-center justify-center rounded-full',
                juste
                    ? 'bg-juste-600 text-white dark:bg-juste-400 dark:text-[#110e0b]'
                    : 'bg-faux-600 text-white dark:bg-faux-400 dark:text-[#110e0b]',
            )}
        >
            <Icone aria-hidden className="size-3" strokeWidth={3.5} />
            <span className="sr-only">{juste ? 'juste' : 'pas encore'}</span>
        </span>
    );
}

/** Texte d'un élément (option, paire, étape), suivi de sa formule s'il en a une. */
export function TexteElement({ element }: { element: Element }) {
    return (
        <>
            {element.texte}
            {element.latex && (
                <Formule
                    latex={element.latex}
                    libelle={element.latex}
                    className={element.texte ? 'ml-1.5' : undefined}
                />
            )}
        </>
    );
}

/** Matière (tuile, couleur, nom) et notion, au-dessus de l'énoncé. */
export function EnteteQuestion({
    question,
    className,
}: {
    question: Pick<QuestionEleve, 'matiere' | 'matiere_nom' | 'notion'>;
    className?: string;
}) {
    const matiere = MATIERES[question.matiere as CleMatiere];

    return (
        <p
            className={cn(
                'flex min-w-0 items-center gap-2 text-aide font-medium',
                className,
            )}
        >
            {matiere && (
                <span
                    aria-hidden
                    className={cn(
                        'flex size-6 shrink-0 items-center justify-center rounded-[7px]',
                        matiere.tuile,
                    )}
                >
                    <matiere.icone className="size-3.5" />
                </span>
            )}
            <span className={cn('shrink-0', matiere?.texte)}>
                {question.matiere_nom}
            </span>
            <span aria-hidden className="text-ink-400">
                ·
            </span>
            <span className="truncate text-ink-500">{question.notion}</span>
        </p>
    );
}

/** Nombre lisible : virgule décimale, espace des milliers. */
export function nombreFr(valeur: unknown): string {
    return typeof valeur === 'number'
        ? valeur.toLocaleString('fr-FR', { maximumFractionDigits: 6 })
        : typeof valeur === 'string'
          ? valeur
          : '';
}
