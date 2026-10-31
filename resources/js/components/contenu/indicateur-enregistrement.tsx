import { CircleAlert, CircleCheck, LoaderCircle, PenLine } from 'lucide-react';
import { formaterHeure } from '@/lib/dates';
import { cn } from '@/lib/utils';

/** L'état d'un brouillon qui s'enregistre seul (leçon, question). */
export type EtatEnregistrement =
    | { cle: 'enregistre'; le: Date | null }
    | { cle: 'modifie' }
    | { cle: 'enregistrement' }
    | { cle: 'conflit'; message: string }
    | { cle: 'erreur'; message: string };

/** « Enregistré à 14 h 05 », « Modifications en cours », « Non enregistré »… */
export function IndicateurEnregistrement({
    etat,
}: {
    etat: EtatEnregistrement;
}) {
    const contenu = {
        enregistre: {
            icone: <CircleCheck aria-hidden className="size-4" />,
            texte:
                etat.cle === 'enregistre' && etat.le
                    ? `Enregistré à ${formaterHeure(etat.le)}`
                    : 'Brouillon enregistré',
            classe: 'text-ink-500',
        },
        modifie: {
            icone: <PenLine aria-hidden className="size-4" />,
            texte: 'Modifications en cours',
            classe: 'text-ink-500',
        },
        enregistrement: {
            icone: <LoaderCircle aria-hidden className="size-4 animate-spin" />,
            texte: 'Enregistrement…',
            classe: 'text-ink-500',
        },
        conflit: {
            icone: <CircleAlert aria-hidden className="size-4" />,
            texte: 'Non enregistré',
            classe: 'text-faux-600 dark:text-faux-400',
        },
        erreur: {
            icone: <CircleAlert aria-hidden className="size-4" />,
            texte: etat.cle === 'erreur' ? etat.message : '',
            classe: 'text-faux-600 dark:text-faux-400',
        },
    }[etat.cle];

    return (
        <p
            role="status"
            aria-live="polite"
            data-capture="variable"
            className={cn(
                'flex max-w-xs items-center gap-1.5 text-aide',
                contenu.classe,
            )}
        >
            {contenu.icone}
            <span className="truncate">{contenu.texte}</span>
        </p>
    );
}
