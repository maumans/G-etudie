import { cn } from '@/lib/utils';
import type { SuiviEnfant } from '@/types/suivi';

const JOURS = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short',
    timeZone: 'UTC',
});

/**
 * Le temps de révision des sept derniers jours (PLAN M15) : une colonne par
 * jour, pleine mandarine si l'objectif du soir est atteint, plus claire
 * sinon. Le détail est aussi donné en texte (lecteurs d'écran).
 */
export function SemaineRevision({
    semaine,
    objectif,
}: {
    semaine: SuiviEnfant['semaine'];
    objectif: number | null;
}) {
    const plafond = Math.max(
        objectif ?? 0,
        ...semaine.map((j) => j.minutes),
        10,
    );

    return (
        <figure className="grid gap-2">
            <div
                className="relative grid grid-cols-7 items-end gap-2"
                aria-hidden
            >
                {objectif !== null && objectif > 0 && (
                    <span
                        className="pointer-events-none absolute inset-x-0 border-t border-dashed border-ink-400/50"
                        style={{ bottom: `${(objectif / plafond) * 80}%` }}
                    />
                )}
                {semaine.map((jour) => (
                    <span
                        key={jour.date}
                        className="flex h-32 flex-col items-center justify-end gap-1"
                    >
                        {jour.minutes > 0 && (
                            <span className="text-meta font-semibold text-ink-600 font-data">
                                {jour.minutes}
                            </span>
                        )}
                        <span
                            className={cn(
                                'w-full rounded-t-[6px]',
                                jour.minutes === 0
                                    ? 'h-1 bg-ink-400/25'
                                    : jour.objectif
                                      ? 'bg-nimba-500 dark:bg-nimba-400'
                                      : 'bg-nimba-500/35 dark:bg-nimba-400/35',
                            )}
                            style={
                                jour.minutes === 0
                                    ? undefined
                                    : {
                                          height: `${Math.max(6, (jour.minutes / plafond) * 80)}%`,
                                      }
                            }
                        />
                    </span>
                ))}
            </div>
            <div
                className="grid grid-cols-7 gap-2 text-center text-meta text-ink-500"
                aria-hidden
            >
                {semaine.map((jour) => (
                    <span key={jour.date} className="first-letter:uppercase">
                        {JOURS.format(
                            new Date(`${jour.date}T12:00:00Z`),
                        ).replace('.', '')}
                    </span>
                ))}
            </div>
            <figcaption className="sr-only">
                {semaine
                    .map(
                        (jour) =>
                            `${JOURS.format(new Date(`${jour.date}T12:00:00Z`))} : ${jour.minutes} minutes`,
                    )
                    .join(', ')}
            </figcaption>
        </figure>
    );
}
