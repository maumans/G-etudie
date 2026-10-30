import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    Check,
    Clock,
    Flame,
    Play,
    ShieldAlert,
    Sparkles,
    Star,
    Target,
    Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { SegmentJauge } from '@/components/jauge-preparation';
import { JaugePreparation } from '@/components/jauge-preparation';
import { BandeauExemple } from '@/components/ui/bandeau-exemple';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    ProgressionBarre,
    ProgressionSegments,
} from '@/components/ui/progression';
import { annoncerBientot } from '@/lib/bientot';
import type { CleMatiere } from '@/lib/matieres';
import { MATIERES } from '@/lib/matieres';
import { cn, formaterNombre } from '@/lib/utils';
import { edit as verifierNumero } from '@/routes/compte/verification';

type EtatJour = 'fait' | 'grace' | 'en_cours' | 'a_venir';

/** Données du tableau de bord (App\Support\Demonstration\TableauDeBordExemple). */
type Tableau = {
    est_exemple: boolean;
    examen: string;
    jauge: { pourcentage: number; matieres: SegmentJauge[] };
    seance: {
        duree_minutes: number;
        questions: number;
        matieres: CleMatiere[];
    };
    serie: {
        jours: number;
        points: number;
        semaine: { jour: string; etat: EtatJour }[];
    };
    progression: {
        cle: CleMatiere;
        notions_maitrisees: number;
        notions: number;
    }[];
    reprendre: {
        cle: CleMatiere;
        chapitre: string;
        lecon: string;
        progression: number;
        minutes_restantes: number;
    }[];
    defi: {
        titre: string;
        fait: number;
        objectif: number;
        jours_restants: number;
    };
    reussites: {
        titre: string;
        detail: string;
        points: number;
        icone: 'eclair' | 'flamme';
    }[];
};

/** « Bonjour » le jour, « Bonsoir » à partir de 18 h. */
function salutation(maintenant: Date): string {
    return maintenant.getHours() >= 18 ? 'Bonsoir' : 'Bonjour';
}

/**
 * Accueil élève : le tableau de bord (DESIGN.md § 6). La séance du jour est
 * l'action dominante ; autour, la jauge, la série, la progression par
 * matière, les leçons à reprendre, le défi, les réussites et le tuteur.
 * Jusqu'aux lots 2 et 6, les données sont d'exemple (bandeau). Tutoiement.
 */
export default function Accueil({ tableau }: { tableau: Tableau }) {
    const { auth } = usePage().props;
    const maintenant = new Date();
    const date = new Intl.DateTimeFormat('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    }).format(maintenant);

    return (
        <>
            <Head title="Accueil" />
            <div className="grid gap-5 lg:gap-6">
                <header>
                    <div className="grid gap-1.5">
                        <p className="text-aide font-medium text-ink-500 first-letter:uppercase">
                            {date}
                        </p>
                        <h1 className="text-[1.75rem] leading-tight titre-contraste lg:text-titre-ecran-large">
                            {salutation(maintenant)},{' '}
                            <strong>{auth.user?.prenom}</strong>
                        </h1>
                        <p className="text-ink-600">
                            Ta séance de {tableau.seance.duree_minutes} minutes
                            t'attend. Un soir après l'autre, ça paie.
                        </p>
                    </div>
                </header>

                {tableau.est_exemple && <BandeauExemple />}

                {auth.user && !auth.user.numero_verifie && (
                    <div className="flex flex-col gap-3 rounded-carte border border-indice-400/45 bg-indice-400/[0.08] p-4 sm:flex-row sm:items-center dark:bg-indice-400/[0.06]">
                        <ShieldAlert
                            aria-hidden
                            className="hidden size-5 shrink-0 text-indice-600 sm:block dark:text-indice-400"
                        />
                        <p className="flex-1 text-ink-600">
                            <span className="font-semibold text-ink-900">
                                Vérifie ton numéro.
                            </span>{' '}
                            Sans lui, impossible de retrouver ton compte si tu
                            oublies ton mot de passe.
                        </p>
                        <Button
                            asChild
                            variant="outline"
                            taille="compacte"
                            className="self-start sm:self-auto"
                        >
                            <Link href={verifierNumero()}>Vérifier</Link>
                        </Button>
                    </div>
                )}

                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-6">
                    {/* Colonne principale */}
                    <div className="grid content-start gap-5 lg:gap-6">
                        <div className="grid gap-5 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-6">
                            <SeanceDuJour seance={tableau.seance} />
                            <Carte className="grid content-between gap-3">
                                <EnTeteCarte
                                    titre="Ma jauge de préparation"
                                    detail={tableau.examen}
                                />
                                <JaugePreparation
                                    pourcentage={tableau.jauge.pourcentage}
                                    examen={tableau.examen}
                                    segments={tableau.jauge.matieres}
                                />
                                <ul className="flex flex-wrap justify-center gap-x-3 gap-y-1.5">
                                    {tableau.jauge.matieres.map((segment) => (
                                        <li
                                            key={segment.cle}
                                            className="flex items-center gap-1.5 text-meta text-ink-600"
                                        >
                                            <span
                                                aria-hidden
                                                className={cn(
                                                    'size-2 rounded-full',
                                                    MATIERES[segment.cle].plein,
                                                )}
                                            />
                                            {MATIERES[segment.cle].nom}
                                        </li>
                                    ))}
                                </ul>
                            </Carte>
                        </div>

                        <section
                            aria-labelledby="titre-progression"
                            className="grid gap-3"
                        >
                            <h2 id="titre-progression" className="sr-only">
                                Ma progression par matière
                            </h2>
                            <ul
                                // Défile sur mobile : atteignable au clavier (axe).
                                tabIndex={0}
                                aria-labelledby="titre-progression"
                                className="-mx-4 flex snap-x snap-mandatory [scrollbar-width:none] gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0 lg:gap-4"
                            >
                                {tableau.progression.map((matiere) => (
                                    <CarteMatiere
                                        key={matiere.cle}
                                        {...matiere}
                                    />
                                ))}
                            </ul>
                        </section>

                        <Carte>
                            <EnTeteCarte
                                titre="Reprendre là où tu t'es arrêté"
                                action={() =>
                                    annoncerBientot('La liste des cours')
                                }
                            />
                            <ul className="mt-2 divide-y">
                                {tableau.reprendre.map((lecon) => (
                                    <LigneReprendre
                                        key={lecon.lecon}
                                        {...lecon}
                                    />
                                ))}
                            </ul>
                        </Carte>
                    </div>

                    {/* Colonne latérale */}
                    <div className="grid content-start gap-5 lg:gap-6">
                        <CarteSerie serie={tableau.serie} />
                        <CarteDefi defi={tableau.defi} />
                        <Carte>
                            <EnTeteCarte
                                titre="Mes réussites"
                                action={() =>
                                    annoncerBientot('Toutes tes réussites')
                                }
                            />
                            <ul className="mt-3 grid gap-2">
                                {tableau.reussites.map((reussite) => (
                                    <Reussite
                                        key={reussite.titre}
                                        {...reussite}
                                    />
                                ))}
                            </ul>
                        </Carte>
                        <CarteTuteur />
                    </div>
                </div>
            </div>
        </>
    );
}

function Carte({
    className,
    children,
}: {
    className?: string;
    children: React.ReactNode;
}) {
    return (
        <section
            className={cn(
                'rounded-carte border bg-card p-5 shadow-carte',
                className,
            )}
        >
            {children}
        </section>
    );
}

function EnTeteCarte({
    titre,
    detail,
    action,
}: {
    titre: string;
    detail?: string;
    action?: () => void;
}) {
    return (
        <div className="flex items-center justify-between gap-3">
            <h2 className="text-[0.9375rem]">{titre}</h2>
            {detail && <Badge variant="nimba">{detail}</Badge>}
            {action && (
                <button
                    type="button"
                    onClick={action}
                    className="shrink-0 rounded-full text-aide font-medium text-ink-500 transition-colors outline-none hover:text-ink-900 focus-visible:outline-2 focus-visible:outline-ring"
                >
                    Tout voir
                </button>
            )}
        </div>
    );
}

function SeanceDuJour({ seance }: { seance: Tableau['seance'] }) {
    return (
        <section className="relative isolate flex flex-col justify-between gap-6 overflow-hidden rounded-carte surface-marque p-6 text-white shadow-releve">
            <span
                aria-hidden
                className="absolute -top-10 -right-10 -z-10 size-40 rounded-full border-[28px] border-white/10"
            />
            <div className="grid gap-2">
                <p className="flex items-center gap-1.5 text-aide font-medium text-white/85">
                    <Sparkles aria-hidden className="size-3.5" />
                    Ta séance du jour
                </p>
                <h2 className="text-[1.625rem] leading-tight titre-contraste">
                    Quinze minutes, <strong>là où ça compte le plus.</strong>
                </h2>
                <ul className="mt-1 flex flex-wrap gap-1.5">
                    {seance.matieres.map((cle) => {
                        const matiere = MATIERES[cle];

                        return (
                            <li
                                key={cle}
                                className="flex items-center gap-1.5 rounded-full bg-white/15 py-1 pr-2.5 pl-1 text-meta font-medium ring-1 ring-white/20"
                            >
                                <span className="flex size-5 items-center justify-center rounded-full bg-white text-nimba-700">
                                    <matiere.icone
                                        aria-hidden
                                        className="size-3"
                                    />
                                </span>
                                {matiere.nom}
                            </li>
                        );
                    })}
                </ul>
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-white/85">
                    <span className="flex items-center gap-1.5">
                        <Clock aria-hidden className="size-4" />
                        {seance.duree_minutes} min
                    </span>
                    <span className="flex items-center gap-1.5">
                        <Target aria-hidden className="size-4" />
                        {seance.questions} questions choisies pour toi
                    </span>
                </p>
            </div>
            <Button
                taille="grande"
                className="w-full bg-white text-nimba-700 shadow-flottant hover:bg-white/90 sm:w-fit"
                onClick={() => annoncerBientot('La séance du jour')}
            >
                <Play aria-hidden className="fill-current" />
                Commencer
            </Button>
        </section>
    );
}

function CarteMatiere({
    cle,
    notions_maitrisees,
    notions,
}: Tableau['progression'][number]) {
    const matiere = MATIERES[cle];
    const pourcentage = Math.round((notions_maitrisees / notions) * 100);

    return (
        <li className="grid w-[15.5rem] shrink-0 snap-start gap-4 rounded-carte border bg-card p-4 shadow-carte sm:w-auto">
            <div className="flex items-center gap-2.5">
                <span
                    aria-hidden
                    className={cn(
                        'flex size-8 items-center justify-center rounded-[10px]',
                        matiere.tuile,
                    )}
                >
                    <matiere.icone className="size-4" />
                </span>
                <span className="truncate font-semibold">{matiere.nom}</span>
            </div>
            <div className="flex items-end justify-between gap-2">
                <span className="text-[1.75rem] leading-none font-bold font-data">
                    {pourcentage}
                    <span className="text-base font-semibold text-ink-500">
                        {' '}
                        %
                    </span>
                </span>
                <span className="text-meta text-ink-500">
                    <span className="font-semibold text-ink-900 font-data">
                        {notions_maitrisees}/{notions}
                    </span>{' '}
                    notions
                </span>
            </div>
            <ProgressionSegments
                valeur={pourcentage}
                libelle={`${matiere.nom} : ${pourcentage} %`}
                couleur={matiere.plein}
            />
        </li>
    );
}

function LigneReprendre({
    cle,
    chapitre,
    lecon,
    progression,
    minutes_restantes,
}: Tableau['reprendre'][number]) {
    const matiere = MATIERES[cle];

    return (
        <li className="flex items-center gap-3 py-3 first:pt-1 last:pb-0">
            <span
                aria-hidden
                className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-[12px]',
                    matiere.tuile,
                )}
            >
                <matiere.icone className="size-[18px]" />
            </span>
            <div className="grid min-w-0 flex-1 gap-1.5">
                <div className="min-w-0">
                    <p className="truncate font-semibold">{lecon}</p>
                    <p className="truncate text-aide text-ink-500">
                        {matiere.nom} · {chapitre}
                    </p>
                </div>
                <ProgressionBarre
                    valeur={progression}
                    libelle={`${lecon} : ${progression} %`}
                    couleur={matiere.plein}
                    className="max-w-48"
                />
            </div>
            <span className="hidden shrink-0 text-aide text-ink-500 font-data sm:block">
                {minutes_restantes} min
            </span>
            <button
                type="button"
                aria-label={`Reprendre « ${lecon} »`}
                onClick={() => annoncerBientot('Le lecteur de leçon')}
                className="flex size-10 shrink-0 items-center justify-center rounded-full border border-contour bg-card text-ink-900 shadow-xs transition-colors outline-none hover:border-nimba-500 hover:text-nimba-700 focus-visible:outline-2 focus-visible:outline-ring dark:hover:text-nimba-300"
            >
                <Play aria-hidden className="size-3.5 fill-current" />
            </button>
        </li>
    );
}

const STYLES_JOUR: Record<EtatJour, { pastille: string; libelle: string }> = {
    fait: {
        pastille:
            'bg-nimba-500 text-white dark:bg-nimba-400 dark:text-[#110e0b]',
        libelle: 'fait',
    },
    grace: {
        pastille: 'bg-soleil-400 text-soleil-900',
        libelle: 'jour de grâce',
    },
    en_cours: {
        pastille:
            'border-2 border-dashed border-nimba-500 text-nimba-700 dark:border-nimba-400 dark:text-nimba-300',
        libelle: "aujourd'hui, en cours",
    },
    a_venir: {
        pastille: 'border border-contour text-ink-400',
        libelle: 'à venir',
    },
};

function CarteSerie({ serie }: { serie: Tableau['serie'] }) {
    return (
        <Carte className="grid gap-4">
            <div className="flex items-start justify-between gap-3">
                <div className="grid gap-0.5">
                    <h2 className="text-[0.9375rem]">Ma série</h2>
                    <p className="flex items-baseline gap-1.5">
                        <span className="text-[2rem] leading-none font-bold font-data">
                            {serie.jours}
                        </span>
                        <span className="text-ink-600">jours de suite</span>
                    </p>
                </div>
                <span
                    aria-hidden
                    className="flex size-11 items-center justify-center rounded-full bg-nimba-500/[0.12] text-nimba-600 dark:bg-nimba-400/15 dark:text-nimba-400"
                >
                    <Flame className="size-5 fill-current" />
                </span>
            </div>
            <ol className="grid grid-cols-7 gap-1.5">
                {serie.semaine.map(({ jour, etat }) => (
                    <li
                        key={jour}
                        className="grid justify-items-center gap-1.5"
                    >
                        <span className="text-meta font-medium text-ink-500">
                            {jour}
                        </span>
                        <span
                            className={cn(
                                'flex size-8 items-center justify-center rounded-full',
                                STYLES_JOUR[etat].pastille,
                            )}
                        >
                            {etat === 'fait' && (
                                <Check
                                    aria-hidden
                                    className="size-3.5"
                                    strokeWidth={3}
                                />
                            )}
                            {etat === 'grace' && (
                                <Star
                                    aria-hidden
                                    className="size-3.5 fill-current"
                                />
                            )}
                            <span className="sr-only">
                                {STYLES_JOUR[etat].libelle}
                            </span>
                        </span>
                    </li>
                ))}
            </ol>
            <p className="flex items-center justify-between rounded-controle bg-craie-100 px-3 py-2 text-aide text-ink-600 dark:bg-relief/60">
                Points d'effort
                <span className="font-semibold text-ink-900 font-data">
                    {formaterNombre(serie.points)}
                </span>
            </p>
        </Carte>
    );
}

function CarteDefi({ defi }: { defi: Tableau['defi'] }) {
    const pourcentage = Math.round((defi.fait / defi.objectif) * 100);

    return (
        <Carte className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-[0.9375rem]">Défi de la semaine</h2>
                <span className="text-meta text-ink-500">
                    encore {defi.jours_restants} jours
                </span>
            </div>
            <p className="font-semibold">{defi.titre}</p>
            <div className="grid gap-1.5">
                <ProgressionSegments
                    valeur={pourcentage}
                    libelle={`${defi.titre} : ${defi.fait} sur ${defi.objectif}`}
                    segments={defi.objectif}
                />
                <p className="text-meta text-ink-500">
                    <span className="font-semibold text-ink-900 font-data">
                        {defi.fait}/{defi.objectif}
                    </span>{' '}
                    réussies
                </p>
            </div>
        </Carte>
    );
}

const ICONES_REUSSITE: Record<
    Tableau['reussites'][number]['icone'],
    LucideIcon
> = {
    eclair: Zap,
    flamme: Flame,
};

function Reussite({
    titre,
    detail,
    points,
    icone,
}: Tableau['reussites'][number]) {
    const Icone = ICONES_REUSSITE[icone];

    return (
        <li className="flex items-center gap-3 rounded-[14px] border bg-craie-50 p-3 dark:bg-relief/40">
            <span
                aria-hidden
                className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-soleil-400/25 text-soleil-700 dark:text-soleil-300"
            >
                <Icone className="size-4" />
            </span>
            <span className="grid min-w-0 flex-1">
                <span className="truncate font-semibold">{titre}</span>
                <span className="truncate text-meta text-ink-500">
                    {detail}
                </span>
            </span>
            <span className="shrink-0 text-aide font-bold text-nimba-700 font-data dark:text-nimba-300">
                +{points}
            </span>
        </li>
    );
}

function CarteTuteur() {
    return (
        <section className="relative isolate overflow-hidden rounded-carte surface-encre p-5 text-white shadow-releve">
            <div className="flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-[0.9375rem]">
                    <Sparkles aria-hidden className="size-4 text-nimba-300" />
                    Ton tuteur N'karamögö
                </h2>
                <span className="rounded-full bg-white/12 px-2 py-0.5 text-meta font-medium text-white/85">
                    bientôt
                </span>
            </div>
            <p className="mt-2 text-aide text-white/70">
                Une explication simple, étape par étape, quand un corrigé te
                bloque.
            </p>
            <button
                type="button"
                onClick={() => annoncerBientot('Le tuteur')}
                className="mt-4 flex w-full items-center justify-between gap-3 rounded-full bg-white/10 py-2 pr-2 pl-4 text-left text-aide text-white/75 ring-1 ring-white/15 transition-colors outline-none hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white"
            >
                <span className="truncate">
                    Explique-moi la loi d'Ohm simplement…
                </span>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-nimba-500 text-white">
                    <ArrowRight aria-hidden className="size-4" />
                </span>
            </button>
        </section>
    );
}
