import { Link } from '@inertiajs/react';
import { ArrowUpRight, TrendingDown, TrendingUp } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { cn, formaterNombre } from '@/lib/utils';

/**
 * Graphiques de la console plateforme (lot 13). Dessinés à la main en SVG :
 * pas de bibliothèque de graphiques (le poids reste celui d'un écran).
 * Règles (compétence `dataviz`) : un seul axe, traits fins, la série mise en
 * avant en mandarine, la série de comparaison en encre neutre **et en
 * pointillés** (second codage : la couleur ne porte jamais seule
 * l'identité), légende dès deux séries, survol avec réglette et bulle, et
 * un tableau équivalent pour les lecteurs d'écran.
 */

const SEMAINE = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
});

/** « 16 nov. » : le lundi d'une semaine (AAAA-MM-JJ). */
export function libelleSemaine(semaine: string): string {
    return SEMAINE.format(new Date(`${semaine}T00:00:00Z`));
}

/** « +17,6 » / « −2 » / « 0 ». */
export function formaterEcart(valeur: number): string {
    if (valeur === 0) {
        return '0';
    }

    return `${valeur > 0 ? '+' : '−'}${formaterNombre(Math.abs(valeur))}`;
}

// ---------------------------------------------------------------------
// Chiffre clé
// ---------------------------------------------------------------------

export function ChiffreCle({
    libelle,
    valeur,
    unite,
    note,
    tendance,
    icone,
    variable = false,
    className,
}: {
    libelle: string;
    valeur: string;
    /** Un compteur qui bouge à chaque passage (journal) : masqué dans les captures. */
    variable?: boolean;
    unite?: string;
    note?: ReactNode;
    /** Écart à la période précédente, en pour cent : flèche et mot, pas la couleur seule. */
    tendance?: number | null;
    icone?: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'grid content-start gap-1.5 rounded-carte border bg-card p-4 shadow-carte',
                className,
            )}
        >
            <dt className="flex items-center gap-2 text-aide text-ink-600">
                {icone}
                {libelle}
            </dt>
            <dd className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
                <span
                    className="text-[1.5rem] leading-tight font-bold tracking-tight font-data"
                    data-capture={variable ? 'variable' : undefined}
                >
                    {valeur}
                </span>
                {unite && (
                    <span className="text-aide font-medium text-ink-500">
                        {unite}
                    </span>
                )}
                {tendance !== undefined && tendance !== null && (
                    <Tendance valeur={tendance} />
                )}
            </dd>
            {note && <dd className="text-meta text-ink-500">{note}</dd>}
        </div>
    );
}

function Tendance({ valeur }: { valeur: number }) {
    const hausse = valeur >= 0;
    const Icone = hausse ? TrendingUp : TrendingDown;

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 rounded-badge px-1.5 py-0.5 text-meta font-semibold font-data',
                hausse
                    ? 'bg-juste-600/[0.12] text-juste-700 dark:bg-juste-400/15 dark:text-juste-400'
                    : 'bg-faux-600/[0.10] text-faux-700 dark:bg-faux-400/15 dark:text-faux-400',
            )}
        >
            <Icone aria-hidden className="size-3" />
            <span className="sr-only">
                {hausse ? 'en hausse de' : 'en baisse de'}
            </span>
            {formaterEcart(valeur)} %
        </span>
    );
}

// ---------------------------------------------------------------------
// Courbes par semaine
// ---------------------------------------------------------------------

export type SerieCourbe = {
    cle: string;
    libelle: string;
    valeurs: (number | null)[];
    /** `marque` : mandarine, trait plein ; `neutre` : encre, pointillés. */
    ton: 'marque' | 'neutre';
};

const TONS = {
    marque: {
        trait: 'stroke-nimba-500 dark:stroke-nimba-400',
        point: 'fill-nimba-500 dark:fill-nimba-400',
        aire: 'fill-nimba-500/[0.10] dark:fill-nimba-400/[0.12]',
        pastille: 'bg-nimba-500 dark:bg-nimba-400',
    },
    neutre: {
        trait: 'stroke-ink-500 dark:stroke-ink-400',
        point: 'fill-ink-500 dark:fill-ink-400',
        aire: '',
        pastille: 'bg-ink-500 dark:bg-ink-400',
    },
} as const;

const L = 600;
const H = 200;

export function Legende({
    series,
    className,
}: {
    series: { cle: string; libelle: string; ton: 'marque' | 'neutre' }[];
    className?: string;
}) {
    return (
        <ul
            className={cn(
                'flex flex-wrap items-center gap-x-4 gap-y-1 text-meta text-ink-600',
                className,
            )}
        >
            {series.map((s) => (
                <li key={s.cle} className="flex items-center gap-1.5">
                    {s.ton === 'neutre' ? (
                        <span
                            aria-hidden
                            className="w-3.5 border-t-2 border-dashed border-ink-500 dark:border-ink-400"
                        />
                    ) : (
                        <span
                            aria-hidden
                            className={cn(
                                'h-0.5 w-3.5 rounded-full',
                                TONS[s.ton].pastille,
                            )}
                        />
                    )}
                    {s.libelle}
                </li>
            ))}
        </ul>
    );
}

export function CourbeSemaines({
    semaines,
    series,
    maximum,
    formater = (v) => formaterNombre(v),
    titre,
    hauteur = 'h-44',
    aire = true,
}: {
    semaines: string[];
    series: SerieCourbe[];
    /** Haut de l'axe (100 pour une jauge) ; sinon le plus grand point, arrondi. */
    maximum?: number;
    formater?: (valeur: number) => string;
    /** Nom accessible du graphique et légende du tableau équivalent. */
    titre: string;
    hauteur?: string;
    aire?: boolean;
}) {
    const id = useId();
    const zone = useRef<HTMLDivElement>(null);
    const [survol, setSurvol] = useState<number | null>(null);
    const valeurs = series.flatMap((s) =>
        s.valeurs.filter((v): v is number => v !== null),
    );
    const haut = maximum ?? arrondirHaut(Math.max(1, ...valeurs));
    const n = Math.max(1, semaines.length - 1);
    const x = (i: number) => (L * i) / n;
    const y = (v: number) => H - (H * v) / haut;
    const paliers = [0, 0.5, 1].map((p) => p * haut);

    function deplacer(clientX: number) {
        const rect = zone.current?.getBoundingClientRect();

        if (!rect || rect.width === 0) {
            return;
        }

        const i = Math.round(((clientX - rect.left) / rect.width) * n);
        setSurvol(Math.min(semaines.length - 1, Math.max(0, i)));
    }

    return (
        <figure className="grid gap-3">
            <Legende series={series} />
            <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2">
                <div
                    aria-hidden
                    className={cn(
                        'relative min-w-8 text-right text-meta whitespace-nowrap text-ink-500 font-data',
                        hauteur,
                    )}
                >
                    {/* La colonne prend la largeur de la plus longue étiquette. */}
                    <span className="invisible block h-0 overflow-hidden">
                        {formater(haut)}
                    </span>
                    {paliers.map((p) => (
                        <span
                            key={p}
                            className="absolute right-0 -translate-y-1/2"
                            style={{ top: `${100 - (100 * p) / haut}%` }}
                        >
                            {formater(p)}
                        </span>
                    ))}
                </div>
                <div
                    ref={zone}
                    role="img"
                    aria-labelledby={`${id}-titre`}
                    className={cn('relative touch-pan-y', hauteur)}
                    onPointerMove={(e) => deplacer(e.clientX)}
                    onPointerDown={(e) => deplacer(e.clientX)}
                    onPointerLeave={() => setSurvol(null)}
                >
                    <svg
                        viewBox={`0 0 ${L} ${H}`}
                        preserveAspectRatio="none"
                        className="absolute inset-0 size-full overflow-visible"
                        aria-hidden
                    >
                        {paliers.map((p) => (
                            <line
                                key={p}
                                x1={0}
                                x2={L}
                                y1={y(p)}
                                y2={y(p)}
                                className="stroke-ink-400/25"
                                strokeWidth={1}
                                vectorEffect="non-scaling-stroke"
                            />
                        ))}
                        {series.map((s) =>
                            segments(s.valeurs).map((segment, k) => (
                                <g key={`${s.cle}-${k}`}>
                                    {aire &&
                                        s.ton === 'marque' &&
                                        segment.length > 1 && (
                                            <path
                                                d={`M${x(segment[0][0])},${H} ${segment.map(([i, v]) => `L${x(i)},${y(v)}`).join(' ')} L${x(segment[segment.length - 1][0])},${H} Z`}
                                                className={TONS.marque.aire}
                                            />
                                        )}
                                    <polyline
                                        points={segment
                                            .map(([i, v]) => `${x(i)},${y(v)}`)
                                            .join(' ')}
                                        fill="none"
                                        className={TONS[s.ton].trait}
                                        strokeWidth={2}
                                        strokeLinejoin="round"
                                        strokeLinecap="round"
                                        strokeDasharray={
                                            s.ton === 'neutre'
                                                ? '5 4'
                                                : undefined
                                        }
                                        vectorEffect="non-scaling-stroke"
                                    />
                                </g>
                            )),
                        )}
                    </svg>

                    {survol !== null && (
                        <>
                            <span
                                aria-hidden
                                className="pointer-events-none absolute inset-y-0 w-px bg-ink-400/60"
                                style={{ left: `${(100 * survol) / n}%` }}
                            />
                            {series.map((s) => {
                                const v = s.valeurs[survol];

                                return v === null || v === undefined ? null : (
                                    <span
                                        key={s.cle}
                                        aria-hidden
                                        className={cn(
                                            'pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card',
                                            TONS[s.ton].pastille,
                                        )}
                                        style={{
                                            left: `${(100 * survol) / n}%`,
                                            top: `${(100 * y(v)) / H}%`,
                                        }}
                                    />
                                );
                            })}
                            <div
                                aria-hidden
                                className={cn(
                                    'pointer-events-none absolute top-0 z-10 grid min-w-36 gap-1 rounded-[10px] border bg-relief px-3 py-2 text-meta shadow-releve',
                                    survol > n / 2
                                        ? '-translate-x-[calc(100%+10px)]'
                                        : 'translate-x-[10px]',
                                )}
                                style={{ left: `${(100 * survol) / n}%` }}
                            >
                                <span className="font-semibold text-ink-900">
                                    Semaine du{' '}
                                    {libelleSemaine(semaines[survol])}
                                </span>
                                {series.map((s) => (
                                    <span
                                        key={s.cle}
                                        className="flex items-center justify-between gap-3 text-ink-600"
                                    >
                                        <span className="flex items-center gap-1.5">
                                            <span
                                                aria-hidden
                                                className={cn(
                                                    'size-2 rounded-[3px]',
                                                    TONS[s.ton].pastille,
                                                )}
                                            />
                                            {s.libelle}
                                        </span>
                                        <span className="font-semibold text-ink-900 font-data">
                                            {s.valeurs[survol] === null
                                                ? '—'
                                                : formater(
                                                      s.valeurs[
                                                          survol
                                                      ] as number,
                                                  )}
                                        </span>
                                    </span>
                                ))}
                            </div>
                        </>
                    )}
                </div>
                <span />
                <p
                    aria-hidden
                    className="mt-1.5 flex justify-between text-meta text-ink-500 font-data"
                    data-capture="variable"
                >
                    <span>{semaines[0] && libelleSemaine(semaines[0])}</span>
                    <span>
                        {semaines.at(-1) &&
                            libelleSemaine(semaines.at(-1) as string)}
                    </span>
                </p>
            </div>
            <TableauEquivalent
                id={`${id}-titre`}
                titre={titre}
                semaines={semaines}
                series={series}
                formater={formater}
            />
        </figure>
    );
}

function TableauEquivalent({
    id,
    titre,
    semaines,
    series,
    formater,
}: {
    id: string;
    titre: string;
    semaines: string[];
    series: { cle: string; libelle: string; valeurs: (number | null)[] }[];
    formater: (v: number) => string;
}) {
    return (
        <figcaption className="sr-only">
            <span id={id}>{titre}</span>
            <table>
                <thead>
                    <tr>
                        <th scope="col">Semaine du</th>
                        {series.map((s) => (
                            <th key={s.cle} scope="col">
                                {s.libelle}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {semaines.map((semaine, i) => (
                        <tr key={semaine}>
                            <th scope="row">{libelleSemaine(semaine)}</th>
                            {series.map((s) => (
                                <td key={s.cle}>
                                    {s.valeurs[i] === null
                                        ? '—'
                                        : formater(s.valeurs[i] as number)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </figcaption>
    );
}

/** Les morceaux continus d'une série (une semaine sans valeur coupe le trait). */
function segments(valeurs: (number | null)[]): [number, number][][] {
    const resultat: [number, number][][] = [];
    let courant: [number, number][] = [];

    valeurs.forEach((v, i) => {
        if (v === null) {
            if (courant.length > 0) {
                resultat.push(courant);
            }

            courant = [];

            return;
        }

        courant.push([i, v]);
    });

    if (courant.length > 0) {
        resultat.push(courant);
    }

    return resultat;
}

/** 1, 2, 5 × 10ⁿ au-dessus de la valeur : un axe aux paliers ronds. */
export function arrondirHaut(valeur: number): number {
    const puissance = 10 ** Math.floor(Math.log10(valeur));

    for (const pas of [1, 2, 2.5, 5, 10]) {
        if (pas * puissance >= valeur) {
            return pas * puissance;
        }
    }

    return 10 * puissance;
}

// ---------------------------------------------------------------------
// Barres par semaine
// ---------------------------------------------------------------------

export function BarresSemaines({
    semaines,
    valeurs,
    formater = (v) => formaterNombre(v),
    titre,
    hauteur = 'h-40',
}: {
    semaines: string[];
    valeurs: number[];
    formater?: (valeur: number) => string;
    titre: string;
    hauteur?: string;
}) {
    // Des comptes (séances, codes) : jamais de palier à 0,5.
    const entiers = valeurs.every((v) => Number.isInteger(v));
    const haut = arrondirHaut(Math.max(entiers ? 4 : 1, ...valeurs));
    const [survol, setSurvol] = useState<number | null>(null);

    return (
        <figure className="grid gap-2">
            <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2">
                <div
                    aria-hidden
                    className={cn(
                        'relative w-12 text-right text-meta text-ink-500 font-data',
                        hauteur,
                    )}
                >
                    {[0, 0.5, 1].map((p) => (
                        <span
                            key={p}
                            className="absolute right-0 -translate-y-1/2"
                            style={{ top: `${100 - 100 * p}%` }}
                        >
                            {formater(p * haut)}
                        </span>
                    ))}
                </div>
                <ol
                    aria-label={titre}
                    className={cn(
                        'relative flex items-end gap-[3px] border-b border-ink-400/30',
                        hauteur,
                    )}
                    onPointerLeave={() => setSurvol(null)}
                >
                    {[0.5, 1].map((p) => (
                        <span
                            key={p}
                            aria-hidden
                            className="pointer-events-none absolute inset-x-0 border-t border-ink-400/20"
                            style={{ top: `${100 - 100 * p}%` }}
                        />
                    ))}
                    {valeurs.map((v, i) => (
                        <li
                            key={semaines[i]}
                            className="relative flex h-full min-w-0 flex-1 flex-col justify-end"
                            onPointerEnter={() => setSurvol(i)}
                            onPointerDown={() => setSurvol(i)}
                        >
                            <span className="sr-only">
                                Semaine du {libelleSemaine(semaines[i])} :{' '}
                                {formater(v)}
                            </span>
                            <span
                                aria-hidden
                                className={cn(
                                    'w-full rounded-t-[4px] transition-colors',
                                    survol === i
                                        ? 'bg-nimba-600 dark:bg-nimba-300'
                                        : 'bg-nimba-500 dark:bg-nimba-400',
                                    v === 0 &&
                                        'bg-ink-400/20 dark:bg-ink-400/20',
                                )}
                                style={{
                                    height:
                                        v === 0
                                            ? '2px'
                                            : `${(100 * v) / haut}%`,
                                }}
                            />
                            {survol === i && (
                                <span
                                    aria-hidden
                                    className={cn(
                                        'pointer-events-none absolute bottom-full z-10 mb-1 grid w-max gap-0.5 rounded-[10px] border bg-relief px-2.5 py-1.5 text-meta shadow-releve',
                                        i > valeurs.length / 2
                                            ? 'right-0'
                                            : 'left-0',
                                    )}
                                >
                                    <span className="text-ink-600">
                                        Semaine du {libelleSemaine(semaines[i])}
                                    </span>
                                    <span className="font-semibold text-ink-900 font-data">
                                        {formater(v)}
                                    </span>
                                </span>
                            )}
                        </li>
                    ))}
                </ol>
                <span />
                <p
                    aria-hidden
                    className="mt-1.5 flex justify-between text-meta text-ink-500 font-data"
                    data-capture="variable"
                >
                    <span>{semaines[0] && libelleSemaine(semaines[0])}</span>
                    <span>
                        {semaines.at(-1) &&
                            libelleSemaine(semaines.at(-1) as string)}
                    </span>
                </p>
            </div>
        </figure>
    );
}

// ---------------------------------------------------------------------
// Répartition (barre empilée, une ligne)
// ---------------------------------------------------------------------

export function Repartition({
    parts,
    libelle,
}: {
    parts: { cle: string; libelle: string; valeur: number; classe: string }[];
    libelle: string;
}) {
    const total = parts.reduce((s, p) => s + p.valeur, 0);

    return (
        <div className="grid gap-3">
            <div
                role="img"
                aria-label={`${libelle} : ${parts.map((p) => `${p.libelle} ${p.valeur}`).join(', ')}`}
                className="flex h-3 gap-[2px] overflow-hidden rounded-full bg-ink-400/15"
            >
                {total > 0 &&
                    parts
                        .filter((p) => p.valeur > 0)
                        .map((p) => (
                            <span
                                key={p.cle}
                                aria-hidden
                                className={cn(
                                    'h-full first:rounded-l-full last:rounded-r-full',
                                    p.classe,
                                )}
                                style={{
                                    width: `${(100 * p.valeur) / total}%`,
                                }}
                            />
                        ))}
            </div>
            <ul className="grid gap-2 text-interface">
                {parts.map((p) => (
                    <li
                        key={p.cle}
                        className="flex items-center justify-between gap-3"
                    >
                        <span className="flex items-center gap-2 text-ink-600">
                            <span
                                aria-hidden
                                className={cn(
                                    'size-2.5 rounded-[3px]',
                                    p.classe,
                                )}
                            />
                            {p.libelle}
                        </span>
                        <span className="font-semibold font-data">
                            {formaterNombre(p.valeur)}
                            {total > 0 && (
                                <span className="ml-1.5 text-meta font-medium text-ink-500">
                                    {Math.round((100 * p.valeur) / total)} %
                                </span>
                            )}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

// ---------------------------------------------------------------------
// En-tête de carte
// ---------------------------------------------------------------------

/** Titre de carte (15 px, 600) et, à droite, un lien vers l'écran détaillé. */
export function EnteteCarte({
    id,
    titre,
    lien,
    libelleLien,
}: {
    id: string;
    titre: string;
    lien?: string;
    libelleLien?: string;
}) {
    return (
        <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id={id} className="text-[0.9375rem] font-semibold">
                {titre}
            </h2>
            {lien && (
                <Link
                    href={lien}
                    prefetch
                    className="inline-flex items-center gap-1 text-aide font-medium text-nimba-700 hover:underline dark:text-nimba-300"
                >
                    {libelleLien}
                    <ArrowUpRight aria-hidden className="size-3.5" />
                </Link>
            )}
        </div>
    );
}
