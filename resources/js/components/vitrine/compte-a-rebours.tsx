import { CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SessionExamen } from '@/lib/vitrine';
import { formaterDateLongue, joursRestants } from '@/lib/vitrine';

/**
 * Le compte à rebours national (PLAN M1) : les prochaines sessions **saisies
 * par l'équipe**, jamais devinées. Sans aucune date saisie, rien n'est
 * affiché (la vitrine ne montre pas de cadre vide).
 */
export function CompteARebours({
    sessions,
    maintenant = new Date(),
    className,
}: {
    sessions: SessionExamen[];
    maintenant?: Date;
    className?: string;
}) {
    const prochaines = sessions
        .map((s) => ({ ...s, jours: joursRestants(s.date, maintenant) }))
        .filter((s) => s.jours >= 0);

    if (prochaines.length === 0) {
        return null;
    }

    return (
        <section
            aria-labelledby="titre-compte-a-rebours"
            className={cn(
                'grid gap-4 rounded-carte border bg-card p-5 shadow-carte',
                className,
            )}
        >
            <h3
                id="titre-compte-a-rebours"
                className="flex items-center gap-2 text-[0.9375rem] font-semibold"
            >
                <CalendarDays
                    aria-hidden
                    className="size-[1.125rem] text-nimba-600 dark:text-nimba-400"
                />
                Avant les prochains examens
            </h3>
            <ul className="grid gap-3 sm:grid-cols-3 sm:gap-0 sm:divide-x">
                {prochaines.map((session) => (
                    <li
                        key={session.examen}
                        className="grid gap-0.5 border-t pt-3 first:border-t-0 first:pt-0 sm:border-t-0 sm:px-4 sm:pt-0 sm:first:pl-0"
                    >
                        <span className="text-[2rem] leading-none font-semibold tracking-tight font-data">
                            {session.jours === 0 ? (
                                'Jour J'
                            ) : (
                                <>
                                    {session.jours}
                                    <span className="ml-1 text-base font-medium tracking-normal text-ink-500">
                                        {session.jours === 1 ? 'jour' : 'jours'}
                                    </span>
                                </>
                            )}
                        </span>
                        <span className="text-interface font-semibold">
                            {session.examen === 'BAC'
                                ? 'Baccalauréat unique'
                                : session.examen}
                        </span>
                        <span className="text-aide text-ink-500">
                            {formaterDateLongue(session.date)}
                        </span>
                    </li>
                ))}
            </ul>
        </section>
    );
}
