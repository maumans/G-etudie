import type { CleMatiere } from '@/lib/matieres';
import { MATIERES } from '@/lib/matieres';
import { cn } from '@/lib/utils';

/**
 * La jauge de préparation (DESIGN.md § 6.1) : un arc ouvert vers le bas,
 * segmenté par matière — chaque segment à la teinte de sa matière, rempli à
 * sa maîtrise. Les segments ont des longueurs égales tant que les
 * coefficients officiels ne sont pas saisis (CLAUDE.md § 5). Le pourcentage
 * est au centre ; le nom accessible donne le détail.
 */
export type SegmentJauge = { cle: CleMatiere; maitrise: number };

const CENTRE = 100;
const RAYON = 80;
const DEBUT = 150; // degrés
const ETENDUE = 240;
const ECART = 5;

function point(angle: number): [number, number] {
    const radians = (angle * Math.PI) / 180;

    return [
        CENTRE + RAYON * Math.cos(radians),
        CENTRE + RAYON * Math.sin(radians),
    ];
}

function arc(depart: number, fin: number): string {
    const [x1, y1] = point(depart);
    const [x2, y2] = point(fin);
    const grand = fin - depart > 180 ? 1 : 0;

    return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${RAYON} ${RAYON} 0 ${grand} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

export function JaugePreparation({
    pourcentage,
    examen,
    segments,
    className,
}: {
    pourcentage: number;
    examen: string;
    segments: SegmentJauge[];
    className?: string;
}) {
    const part =
        (ETENDUE - ECART * (segments.length - 1)) /
        Math.max(1, segments.length);
    const description = [
        `Préparation au ${examen} : ${pourcentage} %`,
        ...segments.map(
            (segment) =>
                `${MATIERES[segment.cle].nom} ${Math.round(segment.maitrise)} %`,
        ),
    ].join('. ');

    return (
        <div
            role="img"
            aria-label={description}
            className={cn('relative mx-auto w-full max-w-[13rem]', className)}
        >
            <svg viewBox="0 0 200 172" className="w-full" aria-hidden>
                {segments.map((segment, index) => {
                    const depart = DEBUT + index * (part + ECART);
                    const rempli = Math.max(
                        1.5,
                        (part * Math.min(100, segment.maitrise)) / 100,
                    );

                    return (
                        <g
                            key={segment.cle}
                            className={MATIERES[segment.cle].trait}
                        >
                            <path
                                d={arc(depart, depart + part)}
                                fill="none"
                                stroke="currentColor"
                                strokeOpacity={0.16}
                                strokeWidth={13}
                                strokeLinecap="round"
                            />
                            <path
                                d={arc(depart, depart + rempli)}
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={13}
                                strokeLinecap="round"
                            />
                        </g>
                    );
                })}
            </svg>
            <div
                aria-hidden
                className="absolute inset-x-0 top-[33%] grid justify-items-center"
            >
                <span className="text-[2.25rem] leading-none font-bold tracking-tight text-ink-900 font-data">
                    {pourcentage}
                    <span className="text-lg font-semibold text-ink-500">
                        {' '}
                        %
                    </span>
                </span>
                <span className="mt-1.5 text-meta font-medium text-ink-500">
                    prêt pour le {examen}
                </span>
            </div>
        </div>
    );
}
