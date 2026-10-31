import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    BookOpen,
    CalendarDays,
    Check,
    Clock,
    Flame,
    GraduationCap,
    PencilLine,
    Play,
    ShieldAlert,
    Sparkles,
    Target,
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
import { cn, formaterNombre, pluriel } from '@/lib/utils';
import { edit as verifierNumero } from '@/routes/compte/verification';
import { bienvenue, cours } from '@/routes/eleve';
import { matiere as pageMatiere } from '@/routes/eleve/cours';
import { show as pageLecon } from '@/routes/eleve/lecons';
import { commencer } from '@/routes/eleve/seance';
import { show as pageSeance } from '@/routes/eleve/seances';

type EtatJour = 'fait' | 'manque' | 'en_cours' | 'a_venir';

/** Données du tableau de bord (App\Services\TableauDeBordEleveService). */
type Tableau = {
    est_exemple: boolean;
    examen: string;
    compte_a_rebours: { date: string | null; jours: number | null };
    jauge: { pourcentage: number; matieres: SegmentJauge[] };
    seance: {
        en_cours: string | null;
        repondues: number;
        questions: number;
        duree_minutes: number;
        matieres: CleMatiere[];
        terminee_aujourdhui: boolean;
    };
    serie: {
        jours: number;
        reponses_semaine: number;
        semaine: { jour: string; etat: EtatJour }[];
    };
    progression: {
        cle: CleMatiere;
        slug: string;
        lecons: number;
        lecons_comprises: number;
    }[];
    reprendre: {
        uuid: string;
        cle: CleMatiere;
        chapitre: string;
        lecon: string;
        progression: number;
        minutes_restantes: number;
        etat: 'comprise' | 'a_revoir' | null;
    }[];
    premiers_pas: {
        cle: 'profil' | 'exercice' | 'lecon' | 'seance';
        fait: boolean;
    }[];
};

/** « Bonjour » le jour, « Bonsoir » à partir de 18 h. */
function salutation(maintenant: Date): string {
    return maintenant.getHours() >= 18 ? 'Bonsoir' : 'Bonjour';
}

function commencerSeance() {
    router.post(commencer.url());
}

/**
 * Accueil élève : le tableau de bord (DESIGN.md § 6.0), avec les vraies
 * données de l'élève (lot 2). Il répond aux trois questions de la thèse
 * (PLAN § 3) : combien de temps avant l'examen (compte à rebours), suis-je
 * prêt (jauge), que faire ce soir (séance du jour, l'action dominante).
 * Autour : mes matières, reprendre, ma série, mes premiers pas, le tuteur.
 * Tutoiement.
 */
export default function Accueil({ tableau }: { tableau: Tableau }) {
    const { auth } = usePage().props;
    const maintenant = new Date();
    const date = new Intl.DateTimeFormat('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    }).format(maintenant);
    const maitrises = new Map(
        tableau.jauge.matieres.map((segment) => [
            segment.cle,
            segment.maitrise,
        ]),
    );
    const premiersPasFaits = tableau.premiers_pas.every((pas) => pas.fait);

    return (
        <>
            <Head title="Accueil" />
            <div className="grid gap-5 lg:gap-6">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="grid gap-1.5">
                        <p className="text-aide font-medium text-ink-500 first-letter:uppercase">
                            {date}
                        </p>
                        <h1 className="text-[1.75rem] leading-tight titre-contraste lg:text-titre-ecran-large">
                            {salutation(maintenant)},{' '}
                            <strong>{auth.user?.prenom}</strong>
                        </h1>
                        <p className="text-ink-600">
                            {tableau.seance.terminee_aujourdhui
                                ? 'Ta séance du jour est faite. Une autre, ou un peu de cours ?'
                                : `Ta séance de ${tableau.seance.duree_minutes} minutes t'attend. Un soir après l'autre, ça paie.`}
                        </p>
                    </div>
                    <CompteARebours
                        examen={tableau.examen}
                        compte={tableau.compte_a_rebours}
                    />
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
                                {tableau.jauge.pourcentage === 0 ? (
                                    <p className="text-center text-aide text-ink-600">
                                        Ta jauge se remplit à chaque exercice
                                        réussi. Commence ce soir.
                                    </p>
                                ) : (
                                    <ul className="flex flex-wrap justify-center gap-x-3 gap-y-1.5">
                                        {tableau.jauge.matieres.map(
                                            (segment) => (
                                                <li
                                                    key={segment.cle}
                                                    className="flex items-center gap-1.5 text-meta text-ink-600"
                                                >
                                                    <span
                                                        aria-hidden
                                                        className={cn(
                                                            'size-2 rounded-full',
                                                            MATIERES[
                                                                segment.cle
                                                            ].plein,
                                                        )}
                                                    />
                                                    {MATIERES[segment.cle].nom}
                                                </li>
                                            ),
                                        )}
                                    </ul>
                                )}
                            </Carte>
                        </div>

                        {tableau.progression.length > 0 && (
                            <section
                                aria-labelledby="titre-progression"
                                className="grid gap-3"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <h2
                                        id="titre-progression"
                                        className="text-[0.9375rem]"
                                    >
                                        Mes matières
                                    </h2>
                                    <LienTout
                                        href={cours().url}
                                        libelle="Tous mes cours"
                                    />
                                </div>
                                <ul
                                    // Défile sur mobile : atteignable au clavier (axe).
                                    tabIndex={0}
                                    aria-labelledby="titre-progression"
                                    className="-mx-4 flex snap-x snap-mandatory [scrollbar-width:none] gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:gap-4 xl:grid-cols-4"
                                >
                                    {tableau.progression.map((matiere) => (
                                        <CarteMatiere
                                            key={matiere.cle}
                                            {...matiere}
                                            maitrise={
                                                maitrises.get(matiere.cle) ?? 0
                                            }
                                        />
                                    ))}
                                </ul>
                            </section>
                        )}

                        <Carte>
                            <div className="flex items-center justify-between gap-3">
                                <h2 className="text-[0.9375rem]">
                                    {tableau.reprendre.some(
                                        (l) => l.progression > 0,
                                    )
                                        ? "Reprendre là où tu t'es arrêté"
                                        : 'Tes premières leçons'}
                                </h2>
                                <LienTout
                                    href={cours().url}
                                    libelle="Tout voir"
                                />
                            </div>
                            {tableau.reprendre.length === 0 ? (
                                <div className="mt-3 flex flex-col items-start gap-3 rounded-controle bg-craie-100 p-4 text-aide text-ink-600 sm:flex-row sm:items-center dark:bg-relief/60">
                                    <BookOpen
                                        aria-hidden
                                        className="size-5 shrink-0 text-ink-500"
                                    />
                                    <p className="flex-1">
                                        Les leçons de ton examen arrivent :
                                        l'équipe pédagogique les rédige.
                                    </p>
                                </div>
                            ) : (
                                <ul className="mt-2 divide-y">
                                    {tableau.reprendre.map((lecon) => (
                                        <LigneReprendre
                                            key={lecon.uuid}
                                            {...lecon}
                                        />
                                    ))}
                                </ul>
                            )}
                        </Carte>
                    </div>

                    {/* Colonne latérale */}
                    <div className="grid content-start gap-5 lg:gap-6">
                        <CarteSerie serie={tableau.serie} />
                        {!premiersPasFaits && (
                            <PremiersPas pas={tableau.premiers_pas} />
                        )}
                        <Carte className="grid gap-3">
                            <div className="flex items-center justify-between gap-3">
                                <h2 className="text-[0.9375rem]">Mon examen</h2>
                                <Link
                                    href={bienvenue()}
                                    className="flex items-center gap-1 rounded-controle text-aide font-medium text-ink-500 outline-none hover:text-ink-900 focus-visible:outline-2 focus-visible:outline-ring"
                                >
                                    <PencilLine
                                        aria-hidden
                                        className="size-3.5"
                                    />
                                    Changer
                                </Link>
                            </div>
                            <p className="flex items-center gap-3">
                                <span
                                    aria-hidden
                                    className="flex size-10 items-center justify-center rounded-[12px] bg-nimba-500/[0.12] text-nimba-700 dark:bg-nimba-400/15 dark:text-nimba-300"
                                >
                                    <GraduationCap className="size-5" />
                                </span>
                                <span className="grid">
                                    <span className="font-semibold">
                                        {tableau.examen}
                                    </span>
                                    <span className="text-aide text-ink-500">
                                        Objectif :{' '}
                                        {tableau.seance.duree_minutes} min par
                                        soir
                                    </span>
                                </span>
                            </p>
                        </Carte>
                        <CarteTuteur />
                    </div>
                </div>
            </div>
        </>
    );
}

/** « J-214 avant le BEPC » ; sans date officielle, on le dit (CLAUDE.md § 5). */
function CompteARebours({
    examen,
    compte,
}: {
    examen: string;
    compte: Tableau['compte_a_rebours'];
}) {
    if (compte.jours === null || compte.date === null) {
        return (
            <p className="flex items-center gap-2 self-start rounded-controle border border-dashed border-contour px-3 py-2 text-aide text-ink-600 sm:self-auto">
                <CalendarDays aria-hidden className="size-4 text-ink-500" />
                Date du {examen} pas encore annoncée
            </p>
        );
    }

    const jour = new Intl.DateTimeFormat('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
    }).format(new Date(`${compte.date}T00:00:00Z`));

    return (
        <p className="grid gap-0.5 self-start rounded-carte border bg-card px-4 py-3 shadow-carte sm:self-auto sm:text-right">
            <span className="flex items-baseline gap-1.5 sm:justify-end">
                <span className="text-[1.75rem] leading-none font-bold tracking-tight font-data">
                    J-{formaterNombre(compte.jours)}
                </span>
                <span className="font-medium text-ink-600">
                    avant le {examen}
                </span>
            </span>
            <span className="text-meta text-ink-500">Session du {jour}</span>
        </p>
    );
}

function Carte({
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

function EnTeteCarte({ titre, detail }: { titre: string; detail?: string }) {
    return (
        <div className="flex items-center justify-between gap-3">
            <h2 className="text-[0.9375rem]">{titre}</h2>
            {detail && <Badge variant="nimba">{detail}</Badge>}
        </div>
    );
}

function LienTout({ href, libelle }: { href: string; libelle: string }) {
    return (
        <Link
            href={href}
            prefetch
            className="shrink-0 rounded-controle text-aide font-medium text-ink-500 transition-colors outline-none hover:text-ink-900 focus-visible:outline-2 focus-visible:outline-ring"
        >
            {libelle}
        </Link>
    );
}

function SeanceDuJour({ seance }: { seance: Tableau['seance'] }) {
    const enCours = seance.en_cours !== null;
    const disponible = seance.questions > 0;

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
                    {seance.terminee_aujourdhui ? (
                        <>
                            Séance faite. <strong>Encore une ?</strong>
                        </>
                    ) : enCours ? (
                        <>
                            Tu en es à{' '}
                            <strong>
                                {seance.repondues} sur {seance.questions}.
                            </strong>
                        </>
                    ) : (
                        <>
                            {seance.duree_minutes} minutes,{' '}
                            <strong>là où ça compte le plus.</strong>
                        </>
                    )}
                </h2>
                {seance.matieres.length > 0 && (
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
                )}
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-white/85">
                    <span className="flex items-center gap-1.5">
                        <Clock aria-hidden className="size-4" />
                        {seance.duree_minutes} min
                    </span>
                    <span className="flex items-center gap-1.5">
                        <Target aria-hidden className="size-4" />
                        {disponible
                            ? `${pluriel(seance.questions, 'question')} choisies pour toi`
                            : 'Les questions de ton examen arrivent'}
                    </span>
                </p>
            </div>
            {enCours ? (
                <Button
                    asChild
                    taille="grande"
                    className="w-full bg-white text-nimba-700 shadow-flottant hover:bg-white/90 sm:w-fit"
                >
                    <Link href={pageSeance(seance.en_cours as string)}>
                        <Play aria-hidden className="fill-current" />
                        Reprendre
                    </Link>
                </Button>
            ) : (
                <Button
                    taille="grande"
                    disabled={!disponible}
                    className="w-full bg-white text-nimba-700 shadow-flottant hover:bg-white/90 sm:w-fit"
                    onClick={commencerSeance}
                >
                    <Play aria-hidden className="fill-current" />
                    {seance.terminee_aujourdhui
                        ? 'Une autre séance'
                        : 'Commencer'}
                </Button>
            )}
        </section>
    );
}

function CarteMatiere({
    cle,
    slug,
    lecons,
    lecons_comprises,
    maitrise,
}: Tableau['progression'][number] & { maitrise: number }) {
    const matiere = MATIERES[cle];

    return (
        <li className="w-[15.5rem] shrink-0 snap-start sm:w-auto">
            <Link
                href={pageMatiere(slug)}
                prefetch
                className="grid h-full gap-4 rounded-carte border bg-card p-4 shadow-carte transition-[border-color,box-shadow] outline-none hover:border-ink-400/60 hover:shadow-releve focus-visible:outline-2 focus-visible:outline-ring"
            >
                <span className="flex items-center gap-2.5">
                    <span
                        aria-hidden
                        className={cn(
                            'flex size-8 items-center justify-center rounded-[10px]',
                            matiere.tuile,
                        )}
                    >
                        <matiere.icone className="size-4" />
                    </span>
                    <span className="truncate font-semibold">
                        {matiere.nom}
                    </span>
                </span>
                <span className="flex items-end justify-between gap-2">
                    <span className="text-[1.75rem] leading-none font-bold font-data">
                        {maitrise}
                        <span className="text-base font-semibold text-ink-500">
                            {' '}
                            %
                        </span>
                    </span>
                    <span className="text-meta text-ink-500">
                        <span className="font-semibold text-ink-900 font-data">
                            {lecons_comprises}/{lecons}
                        </span>{' '}
                        leçons
                    </span>
                </span>
                <ProgressionSegments
                    valeur={maitrise}
                    libelle={`${matiere.nom} : ${maitrise} % des exercices réussis`}
                    couleur={matiere.plein}
                />
            </Link>
        </li>
    );
}

function LigneReprendre({
    uuid,
    cle,
    chapitre,
    lecon,
    progression,
    minutes_restantes,
    etat,
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
                        {etat === 'a_revoir' && ' · à revoir'}
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
            <Link
                href={pageLecon(uuid)}
                prefetch
                aria-label={`${progression > 0 ? 'Reprendre' : 'Lire'} « ${lecon} »`}
                className="flex size-10 shrink-0 items-center justify-center rounded-full border border-contour bg-card text-ink-900 shadow-xs transition-colors outline-none hover:border-nimba-500 hover:text-nimba-700 focus-visible:outline-2 focus-visible:outline-ring dark:hover:text-nimba-300"
            >
                <Play aria-hidden className="size-3.5 fill-current" />
            </Link>
        </li>
    );
}

const STYLES_JOUR: Record<EtatJour, { pastille: string; libelle: string }> = {
    fait: {
        pastille:
            'bg-nimba-500 text-white dark:bg-nimba-400 dark:text-[#110e0b]',
        libelle: 'fait',
    },
    manque: {
        pastille:
            'border border-contour bg-craie-100 text-ink-400 dark:bg-white/[0.04]',
        libelle: 'pas de révision',
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
        // Dépend du jour : masquée dans les captures de référence.
        <Carte className="grid gap-4" data-capture="variable">
            <div className="flex items-start justify-between gap-3">
                <div className="grid gap-0.5">
                    <h2 className="text-[0.9375rem]">Ma série</h2>
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
                            Nouvelle série : on commence ce soir.
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
                            <span className="sr-only">
                                {STYLES_JOUR[etat].libelle}
                            </span>
                        </span>
                    </li>
                ))}
            </ol>
            <p className="flex items-center justify-between rounded-controle bg-craie-100 px-3 py-2 text-aide text-ink-600 dark:bg-relief/60">
                Réponses cette semaine
                <span className="font-semibold text-ink-900 font-data">
                    {formaterNombre(serie.reponses_semaine)}
                </span>
            </p>
        </Carte>
    );
}

const PREMIERS_PAS: Record<
    Tableau['premiers_pas'][number]['cle'],
    { libelle: string; icone: LucideIcon; action?: () => void; href?: string }
> = {
    profil: { libelle: 'Choisir ton examen', icone: GraduationCap },
    exercice: {
        libelle: 'Faire ton premier exercice',
        icone: Target,
        action: commencerSeance,
    },
    lecon: { libelle: 'Ouvrir une leçon', icone: BookOpen, href: cours().url },
    seance: {
        libelle: 'Terminer une séance du jour',
        icone: Flame,
        action: commencerSeance,
    },
};

/** Les quatre premiers gestes : la carte disparaît quand tout est fait. */
function PremiersPas({ pas }: { pas: Tableau['premiers_pas'] }) {
    const faits = pas.filter((p) => p.fait).length;

    return (
        <Carte className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-[0.9375rem]">Mes premiers pas</h2>
                <span className="text-meta text-ink-500 font-data">
                    {faits}/{pas.length}
                </span>
            </div>
            <ProgressionSegments
                valeur={(faits / pas.length) * 100}
                segments={pas.length}
                libelle={`${faits} premiers pas sur ${pas.length}`}
            />
            <ul className="grid gap-1">
                {pas.map(({ cle, fait }) => {
                    const {
                        libelle,
                        icone: Icone,
                        action,
                        href,
                    } = PREMIERS_PAS[cle];
                    const contenu = (
                        <>
                            <span
                                aria-hidden
                                className={cn(
                                    'flex size-7 shrink-0 items-center justify-center rounded-full',
                                    fait
                                        ? 'bg-juste-600 text-white dark:bg-juste-400 dark:text-[#110e0b]'
                                        : 'border border-contour text-ink-500',
                                )}
                            >
                                {fait ? (
                                    <Check
                                        className="size-3.5"
                                        strokeWidth={3}
                                    />
                                ) : (
                                    <Icone className="size-3.5" />
                                )}
                            </span>
                            <span
                                className={cn(
                                    'min-w-0 flex-1 truncate',
                                    fait
                                        ? 'text-ink-500 line-through decoration-ink-400/60'
                                        : 'font-medium text-ink-900',
                                )}
                            >
                                {libelle}
                                <span className="sr-only">
                                    {fait ? ' : fait' : ' : à faire'}
                                </span>
                            </span>
                            {!fait && (
                                <ArrowRight
                                    aria-hidden
                                    className="size-4 shrink-0 text-ink-400"
                                />
                            )}
                        </>
                    );
                    const classe =
                        'flex w-full items-center gap-3 rounded-controle px-2 py-2 text-left text-interface';

                    if (fait || (!action && !href)) {
                        return (
                            <li key={cle} className={classe}>
                                {contenu}
                            </li>
                        );
                    }

                    return (
                        <li key={cle}>
                            {href ? (
                                <Link
                                    href={href}
                                    className={cn(
                                        classe,
                                        'outline-none hover:bg-craie-100 focus-visible:outline-2 focus-visible:outline-ring dark:hover:bg-white/[0.04]',
                                    )}
                                >
                                    {contenu}
                                </Link>
                            ) : (
                                <button
                                    type="button"
                                    onClick={action}
                                    className={cn(
                                        classe,
                                        'outline-none hover:bg-craie-100 focus-visible:outline-2 focus-visible:outline-ring dark:hover:bg-white/[0.04]',
                                    )}
                                >
                                    {contenu}
                                </button>
                            )}
                        </li>
                    );
                })}
            </ul>
        </Carte>
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
