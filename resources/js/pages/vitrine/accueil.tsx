import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    BookOpen,
    ChevronDown,
    FileCheck2,
    GraduationCap,
    Pencil,
    School,
    Smartphone,
    Timer,
    WifiOff,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ApercuApplication } from '@/components/apercu-application';
import { Button } from '@/components/ui/button';
import { annoncerBientot } from '@/lib/bientot';
import type { CleMatiere } from '@/lib/matieres';
import { MATIERES } from '@/lib/matieres';
import { cn } from '@/lib/utils';
import { login, register } from '@/routes';

/** Les trois examens, avec leurs noms officiels (CLAUDE.md § 5). */
const EXAMENS: {
    nom: string;
    niveau: string;
    detail: string;
    icone: LucideIcon;
    tuile: string;
}[] = [
    {
        nom: 'CEE',
        niveau: "Fin de l'école primaire",
        detail: 'Les bases, solides et sans stress, pour entrer au collège.',
        icone: Pencil,
        tuile: 'bg-soleil-400/25 text-soleil-700 dark:text-soleil-300',
    },
    {
        nom: 'BEPC',
        niveau: 'Fin du collège',
        detail: 'Chaque matière, notion par notion, jusqu’au jour J.',
        icone: School,
        tuile: 'bg-nimba-500/[0.12] text-nimba-700 dark:bg-nimba-400/15 dark:text-nimba-300',
    },
    {
        nom: 'Baccalauréat unique',
        niveau: 'Séries SM, SE et SS',
        detail: 'Le programme de votre série, et les annales qui vont avec.',
        icone: GraduationCap,
        tuile: 'bg-physique-600/[0.12] text-physique-700 dark:bg-physique-300/15 dark:text-physique-300',
    },
];

const MATIERES_VITRINE: CleMatiere[] = [
    'maths',
    'physique',
    'chimie',
    'biologie',
    'francais',
    'anglais',
    'histoire',
    'philosophie',
];

/** Les trois atouts, à droite du héros (BrightPath). */
const ATOUTS_HEROS: { titre: string; texte: string; icone: LucideIcon }[] = [
    {
        titre: 'Annales corrigées',
        texte: 'Depuis 2010, étape par étape',
        icone: FileCheck2,
    },
    {
        titre: 'Examens blancs',
        texte: 'Le temps de l’épreuve, la note, le détail',
        icone: Timer,
    },
    {
        titre: 'Hors ligne',
        texte: 'Un cours téléchargé se révise sans réseau',
        icone: WifiOff,
    },
];

const ETAPES: { titre: string; texte: string }[] = [
    {
        titre: 'Créez votre compte',
        texte: 'Un prénom, un pseudo et un numéro de téléphone. Moins d’une minute, sans e-mail.',
    },
    {
        titre: 'Faites la séance du jour',
        texte: 'Quinze minutes de questions choisies là où l’élève est le plus faible — et là où ça rapporte le plus.',
    },
    {
        titre: 'Regardez la jauge monter',
        texte: 'Matière par matière, elle dit la vérité sur la préparation : ni plus, ni moins.',
    },
];

/**
 * Questions fréquentes : chaque réponse vient de PLAN_NKARAMOGO.md (D4,
 * M16, HORS_LIGNE.md) — rien d'annoncé qui ne soit prévu.
 */
const QUESTIONS: { question: string; reponse: string }[] = [
    {
        question: 'Est-ce gratuit ?',
        reponse:
            'Les cours et une partie des annales sont gratuits. Les corrigés détaillés complets, les examens blancs illimités, les cours hors ligne et le tuteur feront partie d’un abonnement.',
    },
    {
        question: 'Faut-il une connexion internet ?',
        reponse:
            'Pour s’inscrire et télécharger, oui. Un cours téléchargé se révise ensuite sans réseau, et les réponses partent toutes seules au retour de la connexion.',
    },
    {
        question: 'Quels examens sont préparés ?',
        reponse:
            'Le CEE, le BEPC et le Baccalauréat unique, séries SM, SE et SS. La filière franco-arabe est prévue.',
    },
    {
        question: 'Comment paiera-t-on l’abonnement ?',
        reponse:
            'Par Orange Money, MTN MoMo, ou avec un code prépayé vendu en librairie et dans les écoles — pour les élèves qui n’ont pas de mobile money.',
    },
];

/**
 * Accueil public (DESIGN.md § 7). Héros à trois colonnes — texte, visuel,
 * atouts —, bandeau de preuves, examens, fonctionnement, FAQ, double appel
 * final. Le visuel est la photo fournie par Maurice (`photoHeros`), sinon
 * l'aperçu dessiné de l'application. Vouvoiement ; aucun chiffre ni
 * témoignage non sourcé.
 */
export default function Accueil({ photoHeros }: { photoHeros: string | null }) {
    return (
        <>
            <Head title="Réviser le CEE, le BEPC et le Baccalauréat" />

            {/* Héros */}
            <section className="relative isolate overflow-hidden">
                <div
                    aria-hidden
                    className="absolute inset-0 -z-10 halo-marque"
                />
                <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pt-10 pb-14 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)_15rem] lg:gap-8 lg:px-8 lg:pt-16 lg:pb-20">
                    <div className="grid justify-items-start gap-6">
                        <p className="text-meta font-bold tracking-[0.18em] text-nimba-700 uppercase dark:text-nimba-300">
                            Réviser · S'entraîner · Réussir
                        </p>
                        <h1 className="text-[2.625rem] leading-[1.02] titre-contraste sm:text-[3.5rem] lg:text-vitrine">
                            Un soir, quinze minutes,{' '}
                            <strong>
                                et je sais{' '}
                                <span className="text-nimba-600 dark:text-nimba-400">
                                    où j'en suis.
                                </span>
                            </strong>
                        </h1>
                        <p className="max-w-md text-base leading-relaxed text-ink-600">
                            Cours, annales corrigées, exercices et examens
                            blancs pour préparer les examens nationaux guinéens
                            — sur téléphone, même avec peu de données.
                        </p>
                        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                            <Button
                                asChild
                                taille="grande"
                                className="pr-2 pl-6"
                            >
                                <Link href={register()} prefetch>
                                    Commencer gratuitement
                                    <span className="flex size-8 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/40">
                                        <ArrowRight aria-hidden />
                                    </span>
                                </Link>
                            </Button>
                            <Button asChild variant="ghost" taille="grande">
                                <Link href={login()} prefetch>
                                    J'ai déjà un compte
                                </Link>
                            </Button>
                        </div>
                        <ul className="flex flex-wrap gap-2">
                            {['CEE', 'BEPC', 'Bac SM', 'Bac SE', 'Bac SS'].map(
                                (examen) => (
                                    <li
                                        key={examen}
                                        className="rounded-full border bg-card/80 px-3 py-1 text-aide font-medium text-ink-600 shadow-xs"
                                    >
                                        {examen}
                                    </li>
                                ),
                            )}
                        </ul>
                    </div>

                    <VisuelHeros photo={photoHeros} />

                    <ul className="grid gap-0 sm:grid-cols-3 lg:grid-cols-1">
                        {ATOUTS_HEROS.map((atout) => (
                            <li
                                key={atout.titre}
                                className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 border-b py-4 last:border-b-0 sm:border-b-0 lg:border-b"
                            >
                                <span
                                    aria-hidden
                                    className="flex size-11 items-center justify-center rounded-full bg-nimba-500 text-white shadow-bouton"
                                >
                                    <atout.icone className="size-5" />
                                </span>
                                <span className="grid gap-0.5">
                                    <span className="text-[0.9375rem] font-bold">
                                        {atout.titre}
                                    </span>
                                    <span className="text-aide text-ink-600">
                                        {atout.texte}
                                    </span>
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            </section>

            {/* Bandeau de preuves (BrightPath) */}
            <section className="mx-auto grid max-w-7xl gap-4 px-4 sm:px-6 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)] lg:px-8">
                <div className="relative isolate overflow-hidden rounded-panneau surface-marque p-7 text-white">
                    <div
                        aria-hidden
                        className="absolute inset-y-0 right-0 -z-10 w-2/3 [background-image:radial-gradient(rgb(255_255_255/0.28)_1.5px,transparent_1.5px)] [mask-image:linear-gradient(to_left,black,transparent)] [background-size:14px_14px]"
                    />
                    <p className="text-[2.75rem] leading-none titre-contraste">
                        <strong>3</strong>
                    </p>
                    <p className="mt-2 max-w-[16rem] text-[0.9375rem] leading-snug text-white/90">
                        examens nationaux préparés, de la fin du primaire au
                        Baccalauréat unique.
                    </p>
                </div>
                <div className="grid content-between gap-6 rounded-panneau border bg-card p-7 shadow-carte">
                    <p className="text-[0.9375rem] font-bold">
                        Les annales, avec leur provenance
                    </p>
                    <p className="text-ink-600">
                        Chaque sujet dit d'où il vient : session, série,
                        matière. Un sujet d'entraînement est toujours marqué
                        comme tel.
                    </p>
                </div>
                <figure className="grid content-between gap-6 rounded-panneau bg-craie-100 p-7 dark:bg-card">
                    <blockquote className="text-[1.0625rem] leading-snug font-medium tracking-tight">
                        <span
                            aria-hidden
                            className="block text-4xl leading-none font-bold text-nimba-500 font-data"
                        >
                            “
                        </span>
                        On corrige une tentative, pas un élève.
                    </blockquote>
                    <figcaption className="text-aide text-ink-600">
                        — Le principe de nos corrigés
                    </figcaption>
                </figure>
            </section>

            {/* Les examens et les matières */}
            <section
                aria-labelledby="titre-examens"
                className="mx-auto grid max-w-7xl gap-8 px-4 py-20 sm:px-6 lg:px-8"
            >
                <EnTeteSection
                    sur="Pour les classes d'examen"
                    titre={
                        <>
                            Un parcours pour <strong>chaque examen</strong>
                        </>
                    }
                    id="titre-examens"
                />
                <ul className="grid gap-4 md:grid-cols-3">
                    {EXAMENS.map((examen) => (
                        <li
                            key={examen.nom}
                            className="grid content-start gap-5 rounded-panneau border bg-card p-6 shadow-carte transition-shadow hover:shadow-releve"
                        >
                            <span
                                aria-hidden
                                className={cn(
                                    'flex size-12 items-center justify-center rounded-2xl',
                                    examen.tuile,
                                )}
                            >
                                <examen.icone className="size-6" />
                            </span>
                            <span className="grid gap-1">
                                <span className="text-lg font-bold">
                                    {examen.nom}
                                </span>
                                <span className="text-aide font-semibold text-nimba-700 dark:text-nimba-300">
                                    {examen.niveau}
                                </span>
                                <span className="mt-1 text-ink-600">
                                    {examen.detail}
                                </span>
                            </span>
                        </li>
                    ))}
                </ul>
                <ul
                    aria-label="Matières"
                    className="flex flex-wrap justify-center gap-2"
                >
                    {MATIERES_VITRINE.map((cle) => {
                        const matiere = MATIERES[cle];

                        return (
                            <li
                                key={cle}
                                className="flex items-center gap-2 rounded-full border bg-card py-1.5 pr-3.5 pl-1.5 text-aide font-medium shadow-xs"
                            >
                                <span
                                    aria-hidden
                                    className={cn(
                                        'flex size-6 items-center justify-center rounded-full',
                                        matiere.tuile,
                                    )}
                                >
                                    <matiere.icone className="size-3.5" />
                                </span>
                                {matiere.nom}
                            </li>
                        );
                    })}
                </ul>
            </section>

            {/* Comment ça marche */}
            <section aria-labelledby="titre-etapes" className="bg-card py-20">
                <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center lg:px-8">
                    <div className="grid gap-8">
                        <EnTeteSection
                            sur="Comment ça marche"
                            titre={
                                <>
                                    Trois gestes, <strong>chaque soir</strong>
                                </>
                            }
                            id="titre-etapes"
                        />
                        <ol className="grid gap-5">
                            {ETAPES.map((etape, index) => (
                                <li
                                    key={etape.titre}
                                    className="grid grid-cols-[auto_minmax(0,1fr)] gap-4"
                                >
                                    <span
                                        aria-hidden
                                        className="flex size-10 items-center justify-center rounded-full bg-ink-900 text-sm font-bold text-craie-50 font-data"
                                    >
                                        {index + 1}
                                    </span>
                                    <span className="grid gap-1 pt-1.5">
                                        <span className="text-[0.9375rem] font-bold">
                                            {etape.titre}
                                        </span>
                                        <span className="text-ink-600">
                                            {etape.texte}
                                        </span>
                                    </span>
                                </li>
                            ))}
                        </ol>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Atout
                            icone={BookOpen}
                            titre="Des cours courts et clairs"
                            texte="Une notion à la fois, des exemples tirés de la vie en Guinée, des formules bien écrites."
                        />
                        <Atout
                            icone={FileCheck2}
                            titre="Des corrigés pas à pas"
                            texte="Chaque étape se déplie ; une erreur se signale d'un geste."
                        />
                        <Atout
                            icone={Smartphone}
                            titre="Fait pour le téléphone"
                            texte="Léger, rapide, lisible sur un petit écran, même le soir."
                        />
                        <Atout
                            icone={WifiOff}
                            titre="Économe en données"
                            texte="Le poids de chaque téléchargement s'affiche avant de commencer."
                        />
                    </div>
                </div>
            </section>

            {/* Questions fréquentes */}
            <section
                aria-labelledby="titre-questions"
                className="mx-auto grid max-w-7xl gap-8 px-4 py-20 sm:px-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:px-8"
            >
                <EnTeteSection
                    sur="Questions fréquentes"
                    titre={
                        <>
                            Ce qu'on nous <strong>demande souvent</strong>
                        </>
                    }
                    id="titre-questions"
                />
                <div className="grid gap-3">
                    {QUESTIONS.map((element) => (
                        <details
                            key={element.question}
                            className="group rounded-carte border bg-card px-5 shadow-carte open:shadow-releve"
                        >
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-semibold outline-none focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
                                {element.question}
                                <ChevronDown
                                    aria-hidden
                                    className="size-4 shrink-0 text-ink-500 transition-transform group-open:rotate-180"
                                />
                            </summary>
                            <p className="pb-4 text-ink-600">
                                {element.reponse}
                            </p>
                        </details>
                    ))}
                </div>
            </section>

            {/* Double appel final (DevSkill) */}
            <section className="mx-auto grid max-w-7xl gap-4 px-4 pb-20 sm:px-6 md:grid-cols-2 lg:px-8">
                <div className="relative isolate grid content-between gap-8 overflow-hidden rounded-panneau surface-marque p-8 text-white">
                    <div className="grid gap-2">
                        <p className="text-meta font-bold tracking-[0.18em] text-white/80 uppercase">
                            Vous êtes élève
                        </p>
                        <h2 className="text-[2rem] leading-tight titre-contraste">
                            Votre première séance{' '}
                            <strong>commence ce soir.</strong>
                        </h2>
                    </div>
                    <Button
                        asChild
                        taille="grande"
                        className="w-fit bg-white text-nimba-700 shadow-flottant hover:bg-white/90"
                    >
                        <Link href={register()} prefetch>
                            Créer un compte
                            <ArrowRight aria-hidden />
                        </Link>
                    </Button>
                </div>
                <div className="relative isolate grid content-between gap-8 overflow-hidden rounded-panneau surface-encre p-8 text-white">
                    <div className="grid gap-2">
                        <p className="text-meta font-bold tracking-[0.18em] text-white/70 uppercase">
                            Parent, enseignant, établissement
                        </p>
                        <h2 className="text-[2rem] leading-tight titre-contraste">
                            Suivre ses élèves,{' '}
                            <strong>sans rien installer.</strong>
                        </h2>
                    </div>
                    <Button
                        taille="grande"
                        variant="outline"
                        className="w-fit border-white/25 bg-white/10 text-white hover:border-white/40 hover:bg-white/15 dark:bg-white/10"
                        onClick={() =>
                            annoncerBientot(
                                "L'espace des parents et des enseignants",
                            )
                        }
                    >
                        Bientôt disponible
                    </Button>
                </div>
            </section>
        </>
    );
}

/**
 * Le visuel du héros : la photo fournie, détourée, devant une forme
 * mandarine ; à défaut, l'aperçu de l'application devant la même forme.
 */
function VisuelHeros({ photo }: { photo: string | null }) {
    return (
        <div className="relative isolate mx-auto flex w-full max-w-md justify-center">
            <div
                aria-hidden
                className="absolute top-[12%] left-1/2 -z-10 aspect-square w-[88%] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_35%_30%,var(--color-nimba-300),var(--color-nimba-500)_70%)] opacity-90"
            />
            <svg
                aria-hidden
                viewBox="0 0 100 100"
                className="absolute -top-2 right-0 -z-10 size-28 text-nimba-300/70"
            >
                {[0, 30, 60, 90, 120, 150].map((angle) => (
                    <rect
                        key={angle}
                        x="46"
                        y="4"
                        width="8"
                        height="92"
                        rx="4"
                        fill="currentColor"
                        transform={`rotate(${angle} 50 50)`}
                    />
                ))}
            </svg>
            {photo ? (
                <img
                    src={photo}
                    alt=""
                    width={900}
                    height={1100}
                    fetchPriority="high"
                    className="relative h-auto w-full max-w-[26rem] object-contain"
                />
            ) : (
                <ApercuApplication className="pt-6" />
            )}
        </div>
    );
}

function Atout({
    icone: Icone,
    titre,
    texte,
}: {
    icone: LucideIcon;
    titre: string;
    texte: string;
}) {
    return (
        <div className="grid content-start gap-3 rounded-carte border bg-background p-5">
            <span
                aria-hidden
                className="flex size-10 items-center justify-center rounded-[12px] bg-nimba-500/[0.12] text-nimba-700 dark:bg-nimba-400/15 dark:text-nimba-300"
            >
                <Icone className="size-5" />
            </span>
            <span className="grid gap-1">
                <span className="font-bold">{titre}</span>
                <span className="text-aide text-ink-600">{texte}</span>
            </span>
        </div>
    );
}

function EnTeteSection({
    sur,
    titre,
    id,
}: {
    sur: string;
    titre: React.ReactNode;
    id: string;
}) {
    return (
        <div className="grid max-w-2xl content-start gap-3">
            <p className="text-meta font-bold tracking-[0.18em] text-nimba-700 uppercase dark:text-nimba-300">
                {sur}
            </p>
            <h2
                id={id}
                className="scroll-mt-28 text-[2rem] leading-[1.1] titre-contraste sm:text-[2.5rem]"
            >
                {titre}
            </h2>
        </div>
    );
}
