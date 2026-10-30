import { Flame, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Aperçu de l'espace élève dans un cadre de téléphone (vitrine) : la jauge
 * de préparation, la séance du jour et la trace, dessinées en HTML et SVG —
 * zéro image à télécharger. Décor : les valeurs sont celles d'un élève
 * imaginaire, l'aperçu est marqué comme tel et caché aux lecteurs d'écran
 * (une phrase le décrit à sa place).
 */

/** Segments de la jauge : teintes de matières, longueurs égales (aucun coefficient affiché). */
const SEGMENTS = [
    { classe: 'text-maths-500', maitrise: 0.72 },
    { classe: 'text-physique-500', maitrise: 0.35 },
    { classe: 'text-biologie-500', maitrise: 0.58 },
    { classe: 'text-francais-500', maitrise: 0.66 },
    { classe: 'text-histoire-500', maitrise: 0.4 },
];

const CENTRE = 100;
const RAYON = 78;
const DEBUT = 150; // degrés : l'arc s'ouvre vers le bas
const ETENDUE = 240;
const ECART = 4;

function point(angle: number) {
    const radians = (angle * Math.PI) / 180;

    return [
        CENTRE + RAYON * Math.cos(radians),
        CENTRE + RAYON * Math.sin(radians),
    ];
}

function arc(depart: number, fin: number) {
    const [x1, y1] = point(depart);
    const [x2, y2] = point(fin);
    const grand = fin - depart > 180 ? 1 : 0;

    return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${RAYON} ${RAYON} 0 ${grand} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

function Jauge() {
    const part = (ETENDUE - ECART * (SEGMENTS.length - 1)) / SEGMENTS.length;

    return (
        <div className="relative mx-auto w-[11.5rem]">
            <svg viewBox="0 0 200 172" className="w-full">
                {SEGMENTS.map((segment, index) => {
                    const depart = DEBUT + index * (part + ECART);

                    return (
                        <g key={index} className={segment.classe}>
                            <path
                                d={arc(depart, depart + part)}
                                fill="none"
                                stroke="currentColor"
                                strokeOpacity={0.18}
                                strokeWidth={12}
                                strokeLinecap="round"
                            />
                            <path
                                d={arc(
                                    depart,
                                    depart +
                                        Math.max(2, part * segment.maitrise),
                                )}
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={12}
                                strokeLinecap="round"
                            />
                        </g>
                    );
                })}
            </svg>
            <div className="absolute inset-x-0 top-[34%] grid justify-items-center">
                <span className="text-[2rem] leading-none font-semibold tracking-tight text-ink-900 font-data">
                    54<span className="text-lg text-ink-500"> %</span>
                </span>
                <span className="mt-1 text-[0.625rem] font-medium text-ink-500">
                    prêt pour le BEPC
                </span>
            </div>
        </div>
    );
}

/** La trace : quatorze jours, pleins quand l'objectif est atteint. */
const TRACE = [1, 1, 0.5, 1, 1, 1, 0, 1, 1, 1, 1, 0.5, 1, 1];

export function ApercuApplication({ className }: { className?: string }) {
    return (
        <figure className={cn('relative', className)}>
            <figcaption className="sr-only">
                Aperçu de l'espace élève : la jauge de préparation par matière,
                la séance du jour et la série de jours de révision.
            </figcaption>
            <div
                aria-hidden
                className="relative mx-auto w-[17.5rem] rounded-[2.5rem] bg-ink-900 p-2.5 shadow-flottant ring-1 ring-black/10 dark:bg-[#26262c] dark:ring-white/10"
            >
                <div className="clair overflow-hidden rounded-[2rem] bg-craie-50 text-ink-900">
                    {/* Barre d'état */}
                    <div className="flex items-center justify-between px-5 pt-3 pb-1 text-[0.625rem] font-semibold">
                        <span className="font-data">20:41</span>
                        <span className="h-4 w-16 rounded-full bg-ink-900" />
                        <span className="font-data">4G</span>
                    </div>

                    <div className="grid gap-3 px-4 pt-2 pb-5">
                        <div className="flex items-center justify-between">
                            <div className="grid">
                                <span className="text-[0.625rem] font-medium tracking-wide text-nimba-700 uppercase">
                                    Mardi · BEPC
                                </span>
                                <span className="text-sm font-semibold tracking-tight">
                                    Bonsoir, Aïssatou
                                </span>
                            </div>
                            <span className="flex items-center gap-1 rounded-full bg-soleil-400/25 px-2 py-1 text-[0.625rem] font-semibold text-soleil-800">
                                <Flame className="size-3 text-soleil-600" />
                                12 jours
                            </span>
                        </div>

                        <div className="rounded-2xl border bg-card px-3 pt-3 pb-2 shadow-carte">
                            <Jauge />
                        </div>

                        <div className="relative overflow-hidden rounded-2xl surface-marque p-3.5 text-white">
                            <span className="text-[0.625rem] font-medium tracking-wide text-white/75 uppercase">
                                Ta séance du jour
                            </span>
                            <p className="mt-1 text-sm leading-snug font-semibold">
                                Maths et physique
                            </p>
                            <p className="text-[0.6875rem] text-white/75">
                                15 min · 12 questions
                            </p>
                            <span className="mt-3 flex h-8 items-center justify-center gap-1.5 rounded-lg bg-white text-xs font-semibold text-nimba-700">
                                <Play className="size-3 fill-current" />
                                Commencer
                            </span>
                        </div>

                        <div className="grid gap-1.5">
                            <span className="text-[0.625rem] font-medium text-ink-500">
                                Tes 14 derniers jours
                            </span>
                            <div className="grid grid-cols-14 gap-1">
                                {TRACE.map((jour, index) => (
                                    <span
                                        key={index}
                                        className={cn(
                                            'aspect-square rounded-[4px]',
                                            jour === 1 && 'bg-soleil-400',
                                            jour === 0.5 &&
                                                'bg-[linear-gradient(135deg,var(--color-soleil-400)_50%,var(--color-soleil-100)_50%)]',
                                            jour === 0 &&
                                                'border border-contour',
                                        )}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </figure>
    );
}
