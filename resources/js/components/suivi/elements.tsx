import { Link } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { ProgressionBarre } from '@/components/ui/progression';
import type { CleMatiere } from '@/lib/matieres';
import { MATIERES } from '@/lib/matieres';
import { cn, formaterNombre, pluriel } from '@/lib/utils';
import type { NotionFaible } from '@/types/suivi';

/**
 * Briques des espaces parent, enseignant et établissement (lot 11) — la
 * même grammaire que l'accueil élève (DESIGN.md § 6.0) : cartes blanches
 * sur fond crème, chiffres en `font-data`, matière = tuile + nom + icône.
 */

export function Carte({
    className,
    children,
    ...props
}: React.ComponentProps<'section'>) {
    return (
        <section
            {...props}
            className={cn(
                'rounded-carte border bg-card p-5 shadow-carte',
                className,
            )}
        >
            {children}
        </section>
    );
}

/** Titre de carte + lien « Tout voir » discret à droite. */
export function TitreCarte({
    id,
    children,
    action,
}: {
    id?: string;
    children: ReactNode;
    action?: ReactNode;
}) {
    return (
        <div className="flex items-center justify-between gap-3">
            <h2 id={id} className="text-[0.9375rem]">
                {children}
            </h2>
            {action}
        </div>
    );
}

export function LienDiscret({
    href,
    children,
    nom,
}: {
    href: string;
    children: ReactNode;
    nom?: string;
}) {
    return (
        <Link
            href={href}
            prefetch
            aria-label={nom}
            className="shrink-0 rounded-controle text-aide font-medium text-ink-500 transition-colors outline-none hover:text-ink-900 focus-visible:outline-2 focus-visible:outline-ring"
        >
            {children}
        </Link>
    );
}

/** Méta + grand titre en contraste (DESIGN.md § 3), et une phrase. */
export function EnteteEcran({
    meta,
    titre,
    chapeau,
    action,
}: {
    meta?: ReactNode;
    titre: ReactNode;
    chapeau?: ReactNode;
    action?: ReactNode;
}) {
    return (
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="grid min-w-0 gap-1.5">
                {meta && (
                    <p className="text-aide font-medium text-ink-500 first-letter:uppercase">
                        {meta}
                    </p>
                )}
                <h1 className="text-[1.75rem] leading-tight titre-contraste lg:text-titre-ecran-large">
                    {titre}
                </h1>
                {chapeau && <p className="max-w-2xl text-ink-600">{chapeau}</p>}
            </div>
            {action && <div className="flex shrink-0 gap-2">{action}</div>}
        </header>
    );
}

/** Un chiffre clé : icône teintée, valeur 700 en `font-data`, libellé. */
export function TuileChiffre({
    icone: Icone,
    libelle,
    valeur,
    unite,
    aide,
}: {
    icone: LucideIcon;
    libelle: string;
    valeur: string | number | null;
    unite?: string;
    aide?: ReactNode;
}) {
    return (
        <div className="flex items-center gap-3 rounded-carte border bg-card p-4 shadow-carte">
            <span
                aria-hidden
                className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-nimba-500/[0.12] text-nimba-700 dark:bg-nimba-400/15 dark:text-nimba-300"
            >
                <Icone className="size-5" />
            </span>
            <div className="grid min-w-0 gap-1">
                <p className="truncate text-aide text-ink-500">{libelle}</p>
                <p className="text-[1.5rem] leading-none font-bold font-data">
                    {valeur === null ? '—' : valeur}
                    {unite && valeur !== null && (
                        <span className="text-base font-semibold text-ink-500">
                            {' '}
                            {unite}
                        </span>
                    )}
                </p>
                {aide && <p className="text-meta text-ink-500">{aide}</p>}
            </div>
        </div>
    );
}

/** Tuile de matière (40 px) : sa teinte et son icône. */
export function TuileMatiere({
    cle,
    taille = 'normale',
}: {
    cle: CleMatiere;
    taille?: 'normale' | 'petite';
}) {
    const matiere = MATIERES[cle];

    return (
        <span
            aria-hidden
            className={cn(
                'flex shrink-0 items-center justify-center',
                taille === 'normale'
                    ? 'size-10 rounded-[12px]'
                    : 'size-8 rounded-[10px]',
                matiere.tuile,
            )}
        >
            <matiere.icone
                className={taille === 'normale' ? 'size-5' : 'size-4'}
            />
        </span>
    );
}

/**
 * Les notions faibles d'une classe (critère du lot 11) : la matière, la
 * notion, la maîtrise moyenne de ceux qui l'ont travaillée, et combien sont
 * fragiles ou ne l'ont jamais travaillée.
 */
export function ListeNotionsFaibles({
    notions,
    total,
    compacte = false,
}: {
    notions: NotionFaible[];
    total: number;
    compacte?: boolean;
}) {
    return (
        <ol className="divide-y">
            {notions.map((notion, rang) => {
                const matiere = MATIERES[notion.cle];

                return (
                    <li
                        key={notion.notion_id}
                        className={cn(
                            'grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2',
                            compacte
                                ? 'py-2.5 first:pt-0 last:pb-0'
                                : 'py-3.5 first:pt-1 last:pb-0',
                        )}
                    >
                        <TuileMatiere
                            cle={notion.cle}
                            taille={compacte ? 'petite' : 'normale'}
                        />
                        <div className="grid min-w-0 gap-0.5">
                            <p className="truncate font-semibold">
                                {!compacte && (
                                    <span className="sr-only">
                                        {rang + 1}.{' '}
                                    </span>
                                )}
                                {notion.notion}
                            </p>
                            <p className="truncate text-aide text-ink-500">
                                <span className={matiere.texte}>
                                    {notion.matiere}
                                </span>{' '}
                                · {notion.chapitre}
                            </p>
                        </div>
                        <p className="text-right">
                            <span className="text-[1.125rem] font-bold font-data">
                                {notion.moyenne}
                            </span>
                            <span className="text-aide font-semibold text-ink-500">
                                {' '}
                                %
                            </span>
                        </p>
                        {!compacte && (
                            <div className="col-span-3 grid gap-1.5 sm:col-span-2 sm:col-start-2">
                                <ProgressionBarre
                                    valeur={notion.moyenne}
                                    libelle={`${notion.notion} : maîtrise moyenne ${notion.moyenne} %`}
                                    couleur={matiere.plein}
                                />
                                <p className="text-meta text-ink-500">
                                    <span className="font-semibold text-faux-700 dark:text-faux-400">
                                        {pluriel(
                                            notion.fragiles,
                                            'élève fragile',
                                            'élèves fragiles',
                                        )}
                                    </span>{' '}
                                    sur {formaterNombre(notion.travaillee_par)}{' '}
                                    {notion.travaillee_par > 1
                                        ? 'qui l’ont travaillée'
                                        : 'qui l’a travaillée'}
                                    {notion.jamais > 0 &&
                                        ` · ${pluriel(notion.jamais, 'élève ne l’a', 'élèves ne l’ont')} jamais travaillée`}
                                    {total > 0 && (
                                        <span className="sr-only">
                                            {' '}
                                            (classe de {total})
                                        </span>
                                    )}
                                </p>
                            </div>
                        )}
                    </li>
                );
            })}
        </ol>
    );
}

/** Une ligne de liste cliquable : tuile, titre, sous-titre, chevron. */
export function LigneLien({
    href,
    tuile,
    titre,
    sousTitre,
    fin,
}: {
    href: string;
    tuile: ReactNode;
    titre: ReactNode;
    sousTitre?: ReactNode;
    fin?: ReactNode;
}) {
    return (
        <li>
            <Link
                href={href}
                prefetch
                className="-mx-2 flex items-center gap-3 rounded-controle px-2 py-3 outline-none hover:bg-craie-100/70 focus-visible:outline-2 focus-visible:outline-ring dark:hover:bg-relief/60"
            >
                {tuile}
                <span className="grid min-w-0 flex-1 gap-0.5">
                    <span className="truncate font-semibold">{titre}</span>
                    {sousTitre && (
                        <span className="truncate text-aide text-ink-500">
                            {sousTitre}
                        </span>
                    )}
                </span>
                {fin}
                <ChevronRight
                    aria-hidden
                    className="size-4 shrink-0 text-ink-400"
                />
            </Link>
        </li>
    );
}

/** Pastille d'initiale (pas de photo de profil, PLAN § 10). */
export function Initiale({
    prenom,
    className,
}: {
    prenom: string;
    className?: string;
}) {
    return (
        <span
            aria-hidden
            className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-full bg-ink-900 text-interface font-semibold text-craie-50',
                className,
            )}
        >
            {prenom.slice(0, 1).toUpperCase()}
        </span>
    );
}
