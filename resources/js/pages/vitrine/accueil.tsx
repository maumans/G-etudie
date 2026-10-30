import { Head, Link } from '@inertiajs/react';
import {
    BookOpen,
    Check,
    ChevronDown,
    FileCheck2,
    Smartphone,
    Timer,
    WifiOff,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ApercuApplication } from '@/components/apercu-application';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { annoncerBientot } from '@/lib/bientot';
import type { CleMatiere } from '@/lib/matieres';
import { MATIERES } from '@/lib/matieres';
import { cn } from '@/lib/utils';
import { login, register } from '@/routes';

/** Emplacements d'image de la vitrine (`App\Support\ImagesVitrine`). */
type Illustrations = Record<'heros' | 'cee' | 'bepc' | 'bac' | 'soir', string>;

/** Les trois examens, avec leurs noms officiels (CLAUDE.md § 5). */
const EXAMENS: {
    nom: string;
    niveau: string;
    detail: string;
    image: keyof Illustrations;
}[] = [
    {
        nom: 'CEE',
        niveau: "Fin de l'école primaire",
        detail: 'Les bases, solides et sans stress, pour entrer au collège.',
        image: 'cee',
    },
    {
        nom: 'BEPC',
        niveau: 'Fin du collège',
        detail: 'Chaque matière, notion par notion, jusqu’au jour de l’épreuve.',
        image: 'bepc',
    },
    {
        nom: 'Baccalauréat unique',
        niveau: 'Séries SM, SE et SS',
        detail: 'Le programme de votre série, et les annales qui vont avec.',
        image: 'bac',
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

/** Ce que la plateforme apporte, sous le héros. */
const PREUVES: { titre: string; texte: string; icone: LucideIcon }[] = [
    {
        titre: 'Annales corrigées depuis 2010',
        texte: 'Chaque sujet dit sa session, sa série et sa matière.',
        icone: FileCheck2,
    },
    {
        titre: 'Examens blancs chronométrés',
        texte: 'La durée de l’épreuve, la note, le détail des erreurs.',
        icone: Timer,
    },
    {
        titre: 'Hors ligne, économe en données',
        texte: 'Un cours téléchargé se révise sans réseau.',
        icone: WifiOff,
    },
];

const ETAPES: { titre: string; texte: string }[] = [
    {
        titre: 'Créez votre compte',
        texte: 'Un prénom, un pseudo et un numéro de téléphone, sans e-mail. Puis votre examen et, au Bac, votre série.',
    },
    {
        titre: 'Révisez un peu chaque soir',
        texte: 'La séance du jour : quinze minutes de questions choisies là où vous êtes le plus faible, et là où ça rapporte le plus.',
    },
    {
        titre: 'Mesurez-vous aux conditions réelles',
        texte: 'Des examens blancs à la durée de l’épreuve. La jauge vous dit, matière par matière, si vous êtes prêt.',
    },
];

/** Les engagements du projet, sous le nom (égalité des chances, PLAN § 1). */
const ENGAGEMENTS: string[] = [
    'Le programme national guinéen, rien d’autre',
    'Des corrigés écrits et relus par des enseignants',
    'Un socle gratuit, pour que chacun ait sa chance',
];

/** Ce qui arrive ensuite (PLAN M10, M11, M14, M15) : annoncé, pas promis à une date. */
const A_VENIR: { titre: string; texte: string }[] = [
    {
        titre: 'Le tuteur N’karamögö',
        texte: 'Une explication plus simple quand une étape du corrigé bloque.',
    },
    {
        titre: 'La culture générale',
        texte: 'La Guinée, l’Afrique et le monde, en questions du jour.',
    },
    {
        titre: 'Les parents et les enseignants',
        texte: 'Suivre la progression, donner des exercices à une classe.',
    },
];

const ATOUTS: { titre: string; texte: string; icone: LucideIcon }[] = [
    {
        titre: 'Des cours courts et clairs',
        texte: 'Une notion à la fois, des exemples tirés de la vie en Guinée, des formules bien écrites.',
        icone: BookOpen,
    },
    {
        titre: 'Des corrigés pas à pas',
        texte: 'Chaque étape se déplie ; une erreur se signale d’un geste.',
        icone: FileCheck2,
    },
    {
        titre: 'Pensé d’abord pour le téléphone',
        texte: 'Léger, rapide, lisible sur un petit écran, même le soir ; à l’aise aussi sur tablette et ordinateur.',
        icone: Smartphone,
    },
    {
        titre: 'Économe en données',
        texte: 'Le poids de chaque téléchargement s’affiche avant de commencer.',
        icone: WifiOff,
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
            'Par Orange Money, MTN MoMo, ou avec un code prépayé vendu en librairie et dans les écoles, pour les élèves qui n’ont pas de mobile money.',
    },
];

/**
 * Accueil public (DESIGN.md § 7). Un seul moment fort : l'illustration du
 * héros, le Nimba au crépuscule et le chemin vers le Bac. Autour, tout reste
 * calme : preuves en filets, examens illustrés, le sens du nom et
 * l'engagement, les étapes jusqu'à l'examen, l'application et ce qui arrive
 * ensuite, les questions, un appel final. Les images viennent de
 * `config/vitrine.php` (dessins par défaut, remplaçables) ; la photo du
 * héros, si Maurice la fournit, se pose devant l'illustration. Vouvoiement ;
 * aucun chiffre ni témoignage non sourcé.
 */
export default function Accueil({
    illustrations,
    photoHeros,
}: {
    illustrations: Illustrations;
    photoHeros: string | null;
}) {
    return (
        <>
            <Head title="Préparer le CEE, le BEPC et le Baccalauréat" />

            {/* Héros */}
            <section className="relative isolate overflow-hidden">
                <div
                    aria-hidden
                    className="absolute inset-0 -z-10 halo-marque dark:opacity-40"
                />
                <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pt-8 pb-16 sm:px-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)] lg:gap-16 lg:px-8 lg:pt-12 lg:pb-24">
                    <div className="grid justify-items-start gap-7">
                        <h1 className="text-[2.5rem] leading-[1.02] titre-contraste sm:text-[3.5rem] lg:text-[4rem]">
                            Tout pour réussir{' '}
                            <strong>le CEE, le BEPC et le Bac.</strong>
                        </h1>
                        <p className="max-w-[32rem] text-[1.0625rem] leading-relaxed text-ink-600">
                            Cours, annales corrigées, exercices, examens blancs
                            et suivi de vos progrès, même hors connexion.
                        </p>
                        <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row">
                            <Button asChild taille="grande">
                                <Link href={register()} prefetch>
                                    Commencer gratuitement
                                </Link>
                            </Button>
                            <Button asChild variant="outline" taille="grande">
                                <Link href={login()} prefetch>
                                    J'ai déjà un compte
                                </Link>
                            </Button>
                        </div>
                        <div className="grid gap-2.5">
                            <p className="text-aide text-ink-500">
                                Examens préparés
                            </p>
                            <ul className="flex flex-wrap gap-1.5">
                                {[
                                    'CEE',
                                    'BEPC',
                                    'Bac SM',
                                    'Bac SE',
                                    'Bac SS',
                                ].map((examen) => (
                                    <li
                                        key={examen}
                                        className="rounded-[7px] border border-contour bg-card/70 px-2.5 py-1 text-aide font-medium text-ink-900"
                                    >
                                        {examen}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <VisuelHeros
                        illustration={illustrations.heros}
                        photo={photoHeros}
                    />
                </div>
            </section>

            {/* Preuves, en filets */}
            <section
                aria-label="Ce que propose N'karamögö"
                className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
            >
                <ul className="grid border-y sm:grid-cols-3 sm:divide-x">
                    {PREUVES.map((preuve) => (
                        <li
                            key={preuve.titre}
                            className="grid grid-cols-[auto_minmax(0,1fr)] gap-3.5 border-b py-6 last:border-b-0 sm:border-b-0 sm:px-6 sm:first:pl-0 sm:last:pr-0"
                        >
                            <preuve.icone
                                aria-hidden
                                className="mt-0.5 size-[1.125rem] text-nimba-600 dark:text-nimba-400"
                            />
                            <span className="grid gap-1">
                                <span className="text-[0.9375rem] font-semibold">
                                    {preuve.titre}
                                </span>
                                <span className="text-aide text-ink-600">
                                    {preuve.texte}
                                </span>
                            </span>
                        </li>
                    ))}
                </ul>
            </section>

            {/* Les examens et les matières */}
            <section
                aria-labelledby="titre-examens"
                className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:px-8 lg:py-28"
            >
                <EnTeteSection
                    id="titre-examens"
                    titre={
                        <>
                            Un parcours pour <strong>chaque examen</strong>
                        </>
                    }
                    texte="Du primaire au Baccalauréat unique : les cours, les annales et les examens blancs de votre classe, au programme guinéen."
                />
                <ul className="grid gap-5 md:grid-cols-3">
                    {EXAMENS.map((examen) => (
                        <li
                            key={examen.nom}
                            className="grid content-start overflow-hidden rounded-carte border bg-card shadow-carte"
                        >
                            <img
                                src={illustrations[examen.image]}
                                alt=""
                                width={360}
                                height={220}
                                loading="lazy"
                                decoding="async"
                                className="aspect-[18/11] w-full object-cover"
                            />
                            <span className="grid gap-1 border-t p-5 pb-6">
                                <span className="text-lg font-semibold">
                                    {examen.nom}
                                </span>
                                <span className="text-aide font-medium text-nimba-700 dark:text-nimba-300">
                                    {examen.niveau}
                                </span>
                                <span className="mt-1.5 text-ink-600">
                                    {examen.detail}
                                </span>
                            </span>
                        </li>
                    ))}
                </ul>
                <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-6">
                    <p className="text-aide text-ink-500">Les matières</p>
                    <ul aria-label="Matières" className="flex flex-wrap gap-2">
                        {MATIERES_VITRINE.map((cle) => {
                            const matiere = MATIERES[cle];

                            return (
                                <li
                                    key={cle}
                                    className="flex items-center gap-2 rounded-[8px] border bg-card py-1 pr-3 pl-1 text-aide font-medium"
                                >
                                    <span
                                        aria-hidden
                                        className={cn(
                                            'flex size-6 items-center justify-center rounded-[6px]',
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
                </div>
            </section>

            {/* Le nom et l'engagement */}
            <section
                aria-labelledby="titre-projet"
                className="mx-auto grid max-w-7xl gap-10 border-t px-4 py-20 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16 lg:px-8 lg:py-28"
            >
                <h2
                    id="titre-projet"
                    className="scroll-mt-28 text-[2rem] leading-[1.05] titre-contraste sm:text-[2.75rem]"
                >
                    N'karamögö veut dire <strong>« mon maître ».</strong>
                </h2>
                <div className="grid content-start gap-7">
                    <p className="max-w-[36rem] text-[1.0625rem] leading-relaxed text-ink-600">
                        Un maître qui explique sans se lasser, disponible le
                        soir, dans la poche. Et G‑Étudie, c'est la Guinée qui
                        étudie : à Conakry comme à Kankan, à Labé ou à
                        Nzérékoré, chaque élève doit avoir les mêmes sujets, les
                        mêmes corrigés et les mêmes chances le jour de l'examen.
                    </p>
                    <ul className="grid gap-3">
                        {ENGAGEMENTS.map((engagement) => (
                            <li
                                key={engagement}
                                className="flex items-start gap-3 text-[0.9375rem] font-medium"
                            >
                                <Check
                                    aria-hidden
                                    className="mt-0.5 size-[1.125rem] shrink-0 text-nimba-600 dark:text-nimba-400"
                                />
                                {engagement}
                            </li>
                        ))}
                    </ul>
                </div>
            </section>

            {/* De l'inscription au jour de l'examen */}
            <section aria-labelledby="titre-etapes" className="bg-card">
                <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-28">
                    <img
                        src={illustrations.soir}
                        alt=""
                        width={560}
                        height={460}
                        loading="lazy"
                        decoding="async"
                        className="mx-auto aspect-[28/23] w-full max-w-xl rounded-panneau object-cover lg:max-w-none"
                    />
                    <div className="grid gap-9">
                        <EnTeteSection
                            id="titre-etapes"
                            titre={
                                <>
                                    De l'inscription{' '}
                                    <strong>au jour de l'examen</strong>
                                </>
                            }
                        />
                        <ol className="grid">
                            {ETAPES.map((etape, index) => (
                                <li
                                    key={etape.titre}
                                    className="relative grid grid-cols-[2rem_minmax(0,1fr)] gap-4 pb-7 last:pb-0"
                                >
                                    {index < ETAPES.length - 1 && (
                                        <span
                                            aria-hidden
                                            className="absolute top-9 bottom-1 left-4 w-px bg-border"
                                        />
                                    )}
                                    <span
                                        aria-hidden
                                        className="flex size-8 items-center justify-center rounded-full border border-contour bg-background text-aide font-semibold text-ink-900 font-data"
                                    >
                                        {index + 1}
                                    </span>
                                    <span className="grid gap-1 pt-1">
                                        <span className="text-[0.9375rem] font-semibold">
                                            {etape.titre}
                                        </span>
                                        <span className="text-ink-600">
                                            {etape.texte}
                                        </span>
                                    </span>
                                </li>
                            ))}
                        </ol>
                        <figure className="grid gap-2 border-l-2 border-nimba-500 pl-5">
                            <blockquote className="text-[1.25rem] leading-snug titre-contraste">
                                On corrige une tentative,{' '}
                                <strong>pas un élève.</strong>
                            </blockquote>
                            <figcaption className="text-aide text-ink-500">
                                Le principe de nos corrigés
                            </figcaption>
                        </figure>
                    </div>
                </div>
            </section>

            {/* L'application */}
            <section
                aria-labelledby="titre-application"
                className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16 lg:px-8 lg:py-28"
            >
                <div className="grid gap-10">
                    <EnTeteSection
                        id="titre-application"
                        titre={
                            <>
                                Dans la poche,{' '}
                                <strong>et partout ailleurs</strong>
                            </>
                        }
                        texte="Téléphone, tablette ou ordinateur : une application web qui s'installe en un geste, sans passer par une boutique, et qui reste légère."
                    />
                    <ul className="grid gap-x-8 sm:grid-cols-2">
                        {ATOUTS.map((atout) => (
                            <li
                                key={atout.titre}
                                className="grid gap-2 border-t py-5"
                            >
                                <atout.icone
                                    aria-hidden
                                    className="size-[1.125rem] text-nimba-600 dark:text-nimba-400"
                                />
                                <span className="text-[0.9375rem] font-semibold">
                                    {atout.titre}
                                </span>
                                <span className="text-aide text-ink-600">
                                    {atout.texte}
                                </span>
                            </li>
                        ))}
                    </ul>
                    <div className="grid gap-1">
                        <p className="text-aide text-ink-500">Et bientôt</p>
                        <ul className="grid">
                            {A_VENIR.map((element) => (
                                <li
                                    key={element.titre}
                                    className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-0.5 border-b py-3.5 last:border-b-0"
                                >
                                    <span className="text-interface font-semibold">
                                        {element.titre}
                                    </span>
                                    <Badge
                                        variant="nimba"
                                        className="row-span-2 mt-0.5"
                                    >
                                        Bientôt
                                    </Badge>
                                    <span className="text-aide text-ink-600">
                                        {element.texte}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
                <div className="relative isolate overflow-hidden rounded-panneau bg-nimba-500/[0.1] px-6 pt-12 dark:bg-nimba-400/10">
                    <Cercles className="absolute top-1/2 left-1/2 -z-10 size-[44rem] -translate-x-1/2 -translate-y-1/2 text-nimba-500/25 dark:text-nimba-400/20" />
                    <ApercuApplication className="-mb-24 sm:-mb-16" />
                </div>
            </section>

            {/* Questions fréquentes */}
            <section
                aria-labelledby="titre-questions"
                className="mx-auto grid max-w-7xl gap-10 px-4 pb-20 sm:px-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16 lg:px-8 lg:pb-28"
            >
                <EnTeteSection
                    id="titre-questions"
                    titre={
                        <>
                            Les questions <strong>qu'on nous pose</strong>
                        </>
                    }
                />
                <div className="border-t">
                    {QUESTIONS.map((element) => (
                        <details
                            key={element.question}
                            className="group border-b"
                        >
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[0.9375rem] font-semibold outline-none focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
                                {element.question}
                                <ChevronDown
                                    aria-hidden
                                    className="size-4 shrink-0 text-ink-500 transition-transform group-open:rotate-180"
                                />
                            </summary>
                            <p className="max-w-[40rem] pb-5 text-ink-600">
                                {element.reponse}
                            </p>
                        </details>
                    ))}
                </div>
            </section>

            {/* Appel final */}
            <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
                <div className="relative isolate grid gap-8 overflow-hidden rounded-panneau surface-encre px-6 py-10 text-white sm:px-10 sm:py-14 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
                    <CouchantEncre className="absolute right-0 bottom-0 -z-10 w-[26rem] max-w-[80%] opacity-90" />
                    <div className="grid content-start justify-items-start gap-6">
                        <h2 className="text-[2rem] leading-[1.08] titre-contraste sm:text-[2.75rem]">
                            Votre première séance{' '}
                            <strong>commence ce soir.</strong>
                        </h2>
                        <p className="max-w-md text-white/75">
                            Créez votre compte en une minute ; la séance du jour
                            vous attend dans votre espace.
                        </p>
                        <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row">
                            <Button asChild taille="grande">
                                <Link href={register()} prefetch>
                                    Créer un compte
                                </Link>
                            </Button>
                            <Button
                                taille="grande"
                                variant="ghost"
                                className="text-white/85 hover:bg-white/10 hover:text-white"
                                onClick={() =>
                                    annoncerBientot(
                                        "L'espace des parents et des enseignants",
                                    )
                                }
                            >
                                Parent ou enseignant ?
                            </Button>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}

/**
 * Le visuel du héros : l'illustration (dessin par défaut ou image choisie
 * par Maurice), la photo détourée devant si elle est fournie, et deux
 * fiches de l'application qui débordent du cadre — un élève imaginaire,
 * décrit aux lecteurs d'écran par une phrase.
 */
function VisuelHeros({
    illustration,
    photo,
}: {
    illustration: string;
    photo: string | null;
}) {
    return (
        <figure className="relative mx-auto w-full max-w-[34rem] lg:max-w-none">
            <figcaption className="sr-only">
                Le Nimba au crépuscule, et un chemin qui monte vers le sommet ;
                devant, la séance du jour et la jauge de préparation d'un élève.
            </figcaption>
            <div className="relative overflow-hidden rounded-panneau bg-nimba-200 ring-1 ring-black/5">
                <img
                    src={illustration}
                    alt=""
                    width={600}
                    height={700}
                    fetchPriority="high"
                    className="aspect-[5/4] w-full object-cover object-[50%_70%] sm:aspect-[6/7] lg:aspect-square dark:brightness-90"
                />
                {photo && (
                    <img
                        src={photo}
                        alt=""
                        width={900}
                        height={1100}
                        className="absolute bottom-0 left-1/2 h-[92%] w-auto -translate-x-1/2 object-contain"
                    />
                )}
            </div>

            <div
                aria-hidden
                className="absolute -bottom-6 left-3 grid w-64 animate-in gap-3 rounded-carte border bg-card p-4 shadow-flottant duration-700 [animation-delay:250ms] [animation-fill-mode:both] fade-in slide-in-from-bottom-3 sm:-left-6 lg:-left-10"
            >
                <span className="flex items-center gap-3">
                    <span
                        className={cn(
                            'flex size-9 items-center justify-center rounded-[10px]',
                            MATIERES.maths.tuile,
                        )}
                    >
                        <MATIERES.maths.icone className="size-[1.125rem]" />
                    </span>
                    <span className="grid">
                        <span className="text-[0.9375rem] font-semibold">
                            Séance du jour
                        </span>
                        <span className="text-aide text-ink-500">
                            Mathématiques, 15 min
                        </span>
                    </span>
                </span>
                <span className="grid gap-1.5">
                    <span className="flex justify-between text-meta text-ink-500">
                        <span>Questions</span>
                        <span className="font-semibold text-ink-900 font-data">
                            8 / 12
                        </span>
                    </span>
                    <span className="grid h-1.5 grid-cols-12 gap-0.5">
                        {Array.from({ length: 12 }, (_, index) => (
                            <span
                                key={index}
                                className={cn(
                                    'rounded-full',
                                    index < 8
                                        ? 'bg-nimba-500'
                                        : 'bg-craie-100 dark:bg-white/10',
                                )}
                            />
                        ))}
                    </span>
                </span>
            </div>

            <div
                aria-hidden
                className="absolute top-6 -right-2 hidden w-52 animate-in gap-2 rounded-carte border bg-card p-4 shadow-flottant duration-700 [animation-delay:450ms] [animation-fill-mode:both] fade-in slide-in-from-bottom-3 sm:grid lg:-right-6"
            >
                <span className="text-aide text-ink-500">
                    Prêt pour le BEPC
                </span>
                <span className="text-[2rem] leading-none font-semibold tracking-tight font-data">
                    54
                    <span className="ml-0.5 text-lg font-medium text-ink-500">
                        %
                    </span>
                </span>
                <span className="flex h-1.5 gap-0.5">
                    <span className="w-[22%] rounded-full bg-maths-500" />
                    <span className="w-[10%] rounded-full bg-physique-500" />
                    <span className="w-[14%] rounded-full bg-biologie-500" />
                    <span className="w-[8%] rounded-full bg-francais-500" />
                    <span className="flex-1 rounded-full bg-craie-100 dark:bg-white/10" />
                </span>
            </div>
        </figure>
    );
}

/** Cercles concentriques, le motif du soleil de l'illustration du héros. */
function Cercles({ className }: { className?: string }) {
    return (
        <svg
            aria-hidden
            viewBox="0 0 400 400"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className={className}
        >
            {[60, 95, 130, 165, 199].map((rayon) => (
                <circle key={rayon} cx="200" cy="200" r={rayon} />
            ))}
        </svg>
    );
}

/** Le soleil qui se couche derrière le Nimba, version de nuit (appel final). */
function CouchantEncre({ className }: { className?: string }) {
    return (
        <svg aria-hidden viewBox="0 0 420 260" className={className}>
            <g fill="none" stroke="#FE8959" strokeWidth="1">
                <circle cx="300" cy="200" r="110" strokeOpacity=".35" />
                <circle cx="300" cy="200" r="150" strokeOpacity=".2" />
                <circle cx="300" cy="200" r="194" strokeOpacity=".1" />
            </g>
            <circle cx="300" cy="200" r="74" fill="#D04904" />
            <path
                fill="#3A1D12"
                d="M0 236C60 222 104 228 150 206C192 186 220 200 262 190C300 181 320 160 356 168C384 174 400 190 420 186V260H0Z"
            />
            <path
                fill="#1E1814"
                d="M0 250H70C84 250 88 232 102 232H210C226 232 230 248 246 250L420 252V260H0Z"
            />
        </svg>
    );
}

function EnTeteSection({
    titre,
    texte,
    id,
}: {
    titre: React.ReactNode;
    texte?: string;
    id: string;
}) {
    return (
        <div className="grid max-w-2xl content-start gap-4">
            <h2
                id={id}
                className="scroll-mt-28 text-[2rem] leading-[1.05] titre-contraste sm:text-[2.75rem]"
            >
                {titre}
            </h2>
            {texte && (
                <p className="max-w-[36rem] text-[1.0625rem] leading-relaxed text-ink-600">
                    {texte}
                </p>
            )}
        </div>
    );
}
