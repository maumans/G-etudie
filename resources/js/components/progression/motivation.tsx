import { Link } from '@inertiajs/react';
import { Check, Lock, Swords } from 'lucide-react';
import { ProgressionSegments } from '@/components/ui/progression';
import { MATIERES } from '@/lib/matieres';
import type { Badge, Defi } from '@/lib/motivation';
import { iconeBadge, jourEnClair } from '@/lib/motivation';
import { cn } from '@/lib/utils';

/**
 * Défi de la semaine (PLAN M9, DESIGN.md § 6.0) : la matière, l'objectif en
 * tirets, le compte. Sans matière ayant des exercices : on le dit.
 */
export function CarteDefi({
    defi,
    className,
}: {
    defi: Defi | null;
    className?: string;
}) {
    if (defi === null) {
        return (
            <section
                className={cn(
                    'grid gap-2 rounded-carte border bg-card p-5 shadow-carte',
                    className,
                )}
            >
                <h2 className="text-[0.9375rem]">Défi de la semaine</h2>
                <p className="text-aide text-ink-600">
                    Il arrive avec les premiers exercices de ton examen.
                </p>
            </section>
        );
    }

    const matiere = MATIERES[defi.cle];

    return (
        <section
            data-capture="variable"
            className={cn(
                'grid gap-3 rounded-carte border bg-card p-5 shadow-carte',
                className,
            )}
        >
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-[0.9375rem]">Défi de la semaine</h2>
                <span className="text-meta text-ink-500">
                    jusqu’au {jourEnClair(defi.fin)}
                </span>
            </div>
            <p className="flex items-center gap-3">
                <span
                    aria-hidden
                    className={cn(
                        'flex size-10 shrink-0 items-center justify-center rounded-[12px]',
                        matiere.tuile,
                    )}
                >
                    {defi.reussi ? (
                        <Check className="size-[18px]" strokeWidth={2.5} />
                    ) : (
                        <Swords className="size-[18px]" />
                    )}
                </span>
                <span className="grid min-w-0">
                    <span className="font-semibold">
                        {defi.objectif} bonnes réponses en {matiere.nom}
                    </span>
                    <span className="text-aide text-ink-500">
                        {defi.reussi
                            ? 'Défi relevé : +30 points.'
                            : 'La matière où tes efforts comptent le plus.'}
                    </span>
                </span>
            </p>
            <div className="flex items-center gap-3">
                <ProgressionSegments
                    valeur={(100 * defi.fait) / defi.objectif}
                    segments={Math.min(10, defi.objectif)}
                    couleur={matiere.plein}
                    libelle={`Défi : ${defi.fait} bonnes réponses sur ${defi.objectif}`}
                    className="flex-1"
                />
                <span className="shrink-0 text-aide font-semibold font-data">
                    {defi.fait}/{defi.objectif}
                </span>
            </div>
        </section>
    );
}

/** Une pastille de badge : couleur quand il est gagné, cadenas sinon. */
export function PastilleBadge({
    badge,
    taille = 'normale',
}: {
    badge: Badge;
    taille?: 'normale' | 'grande';
}) {
    const Icone = iconeBadge(badge.icone);
    const obtenu = badge.obtenu_le !== null;

    return (
        <span
            aria-hidden
            className={cn(
                'relative flex shrink-0 items-center justify-center rounded-full',
                taille === 'grande' ? 'size-12' : 'size-10',
                obtenu
                    ? 'bg-soleil-400 text-soleil-900'
                    : 'border border-dashed border-contour bg-craie-100 text-ink-400 dark:bg-white/[0.04]',
            )}
        >
            <Icone className={taille === 'grande' ? 'size-5' : 'size-[18px]'} />
            {!obtenu && (
                <Lock className="absolute -right-0.5 -bottom-0.5 size-3.5 rounded-full bg-card p-0.5 text-ink-500" />
            )}
        </span>
    );
}

/**
 * Mes réussites, pour l'accueil : combien, les derniers badges gagnés et
 * le prochain à gagner. Tout le catalogue est sur « Ma progression ».
 */
export function CarteReussites({
    reussites,
    href,
}: {
    reussites: {
        obtenus: number;
        total: number;
        derniers: Badge[];
        prochain: Badge | null;
    };
    href: string;
}) {
    return (
        <section className="grid gap-3 rounded-carte border bg-card p-5 shadow-carte">
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-[0.9375rem]">Mes réussites</h2>
                <Link
                    href={href}
                    prefetch
                    className="shrink-0 rounded-controle text-aide font-medium text-ink-500 outline-none hover:text-ink-900 focus-visible:outline-2 focus-visible:outline-ring"
                >
                    {reussites.obtenus}/{reussites.total} badges
                </Link>
            </div>
            {reussites.derniers.length > 0 ? (
                <ul className="grid gap-2.5">
                    {reussites.derniers.map((badge) => (
                        <li key={badge.cle} className="flex items-center gap-3">
                            <PastilleBadge badge={badge} />
                            <span className="grid min-w-0 flex-1">
                                <span className="truncate font-semibold">
                                    {badge.nom}
                                </span>
                                <span className="truncate text-aide text-ink-500">
                                    {badge.description}
                                </span>
                            </span>
                            <span className="shrink-0 text-aide font-semibold text-ink-600 font-data">
                                +{badge.points}
                            </span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-aide text-ink-600">
                    Ton premier badge t’attend au premier exercice.
                </p>
            )}
            {reussites.prochain && (
                <p className="flex items-center gap-3 border-t pt-3">
                    <PastilleBadge badge={reussites.prochain} />
                    <span className="grid min-w-0 flex-1">
                        <span className="text-meta text-ink-500">
                            Prochain badge
                        </span>
                        <span className="truncate font-medium">
                            {reussites.prochain.nom} —{' '}
                            {reussites.prochain.description}
                        </span>
                    </span>
                </p>
            )}
        </section>
    );
}
