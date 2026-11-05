import { Check, Flame, Star } from 'lucide-react';
import { ProgressionBarre } from '@/components/ui/progression';
import type { Points } from '@/lib/motivation';
import { partDuNiveau } from '@/lib/motivation';
import type { EtatCase, Serie } from '@/lib/progression/locale';
import { cn, formaterNombre } from '@/lib/utils';

const CASES: Record<EtatCase, { classe: string; libelle: string }> = {
    objectif: {
        classe: 'bg-nimba-500 text-white dark:bg-nimba-400 dark:text-[#110e0b]',
        libelle: 'objectif atteint',
    },
    commence: {
        // À moitié : le bas de la case, à la couleur de l'accent.
        classe: 'border border-nimba-500/60 bg-[linear-gradient(to_top,var(--color-nimba-500)_0_50%,transparent_50%)] dark:border-nimba-400/60 dark:bg-[linear-gradient(to_top,var(--color-nimba-400)_0_50%,transparent_50%)]',
        libelle: 'commencé',
    },
    grace: {
        classe: 'bg-soleil-400/30 text-soleil-700 dark:bg-soleil-400/20 dark:text-soleil-300',
        libelle: 'jour de grâce',
    },
    aujourdhui: {
        classe: 'border-2 border-dashed border-nimba-500 dark:border-nimba-400',
        libelle: "aujourd'hui, pas encore fait",
    },
    manque: {
        classe: 'border border-contour bg-craie-100 dark:bg-white/[0.04]',
        libelle: 'rien ce jour-là',
    },
    a_venir: {
        classe: 'border border-contour',
        libelle: 'à venir',
    },
};

/**
 * La trace (DESIGN.md § 6.3) : quatorze cases, de lundi dernier à dimanche,
 * pleines quand l'objectif est atteint, à moitié quand l'élève a commencé,
 * une étoile pour le jour de grâce. Une flamme et le nombre de jours ; une
 * série rompue dit « on repart », sans reproche. Dessous, les points
 * d'effort et le niveau. `provisoire` : des réponses de ce téléphone pas
 * encore reçues par le serveur sont comptées.
 */
export function CarteSerie({
    serie,
    points,
    provisoire = false,
    className,
}: {
    serie: Serie;
    points?: Points;
    provisoire?: boolean;
    className?: string;
}) {
    const semaines = [serie.cases.slice(0, 7), serie.cases.slice(7, 14)];

    return (
        // Dépend du jour : masquée dans les captures de référence.
        <section
            data-capture="variable"
            aria-labelledby="titre-serie"
            className={cn(
                'grid gap-4 rounded-carte border bg-card p-5 shadow-carte',
                className,
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="grid gap-0.5">
                    <h2 id="titre-serie" className="text-[0.9375rem]">
                        Ma série
                    </h2>
                    {serie.jours > 0 ? (
                        <p className="flex items-baseline gap-1.5">
                            <span className="text-[2rem] leading-none font-bold font-data">
                                {serie.jours}
                            </span>
                            <span className="text-ink-600">
                                {serie.jours > 1 ? 'jours de suite' : 'jour'}
                            </span>
                        </p>
                    ) : (
                        <p className="text-ink-600">
                            {serie.rompue
                                ? 'Nouvelle série — on repart ce soir.'
                                : 'Nouvelle série : on commence ce soir.'}
                        </p>
                    )}
                </div>
                <span
                    aria-hidden
                    className="flex size-11 items-center justify-center rounded-full bg-nimba-500/[0.12] text-nimba-600 dark:bg-nimba-400/15 dark:text-nimba-400"
                >
                    <Flame className="size-5 fill-current" />
                </span>
            </div>

            <div className="grid gap-1.5">
                <ol className="grid grid-cols-7 gap-1.5" aria-hidden>
                    {semaines[0].map((c) => (
                        <li
                            key={c.jour}
                            className="text-center text-meta font-medium text-ink-500"
                        >
                            {c.jour}
                        </li>
                    ))}
                </ol>
                {semaines.map((semaine, rang) => (
                    <ol
                        key={rang}
                        aria-label={
                            rang === 0 ? 'Semaine dernière' : 'Cette semaine'
                        }
                        className="grid grid-cols-7 gap-1.5"
                    >
                        {semaine.map((c) => (
                            <li
                                key={c.date}
                                className="grid justify-items-center"
                            >
                                <span
                                    className={cn(
                                        'flex size-8 items-center justify-center rounded-[9px]',
                                        CASES[c.etat].classe,
                                    )}
                                >
                                    {c.etat === 'objectif' && (
                                        <Check
                                            aria-hidden
                                            className="size-3.5"
                                            strokeWidth={3}
                                        />
                                    )}
                                    {c.etat === 'grace' && (
                                        <Star
                                            aria-hidden
                                            className="size-3.5 fill-current"
                                        />
                                    )}
                                    <span className="sr-only">
                                        {c.jour} {c.date.slice(8)} :{' '}
                                        {CASES[c.etat].libelle}
                                    </span>
                                </span>
                            </li>
                        ))}
                    </ol>
                ))}
            </div>

            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-meta text-ink-500">
                <span className="flex items-center gap-1.5">
                    <span
                        aria-hidden
                        className="size-2.5 rounded-[3px] bg-nimba-500 dark:bg-nimba-400"
                    />
                    objectif atteint
                </span>
                <span className="flex items-center gap-1.5">
                    <Star
                        aria-hidden
                        className="size-3 fill-soleil-400 text-soleil-500"
                    />
                    jour de grâce (un par semaine)
                </span>
            </p>

            {provisoire && (
                <p className="text-meta text-ink-500">
                    Compte provisoire : tes réponses de ce téléphone partiront
                    au retour du réseau.
                </p>
            )}

            {points && (
                <div className="grid gap-2 rounded-controle bg-craie-100 px-3 py-2.5 dark:bg-relief/60">
                    <p className="flex items-center justify-between text-aide text-ink-600">
                        <span>
                            Niveau{' '}
                            <span className="font-semibold text-ink-900 font-data">
                                {points.niveau}
                            </span>
                        </span>
                        <span>
                            <span className="font-semibold text-ink-900 font-data">
                                {formaterNombre(points.total)}
                            </span>{' '}
                            points d’effort
                        </span>
                    </p>
                    <ProgressionBarre
                        valeur={partDuNiveau(points)}
                        libelle={
                            points.prochain_palier === null
                                ? 'Dernier niveau atteint'
                                : `Niveau ${points.niveau + 1} à ${points.prochain_palier} points`
                        }
                    />
                    <p className="text-meta text-ink-600">
                        {points.prochain_palier === null
                            ? 'Dernier niveau atteint. Bravo.'
                            : `Encore ${formaterNombre(points.prochain_palier - points.total)} points pour le niveau ${points.niveau + 1}.`}
                    </p>
                </div>
            )}
        </section>
    );
}
