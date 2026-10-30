import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    BookOpen,
    Check,
    FileCheck2,
    GraduationCap,
    Pencil,
    School,
    Timer,
    WifiOff,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ApercuApplication } from '@/components/apercu-application';
import { Button } from '@/components/ui/button';
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
        detail: 'Les bases, solides et sans stress.',
        icone: Pencil,
        tuile: 'bg-soleil-400/20 text-soleil-700 ring-soleil-500/25 dark:text-soleil-300',
    },
    {
        nom: 'BEPC',
        niveau: 'Fin du collège',
        detail: 'Chaque matière, notion par notion.',
        icone: School,
        tuile: 'bg-nimba-600/[0.10] text-nimba-700 ring-nimba-600/20 dark:bg-nimba-300/15 dark:text-nimba-300',
    },
    {
        nom: 'Baccalauréat unique',
        niveau: 'Séries SM, SE et SS',
        detail: 'Le programme de votre série.',
        icone: GraduationCap,
        tuile: 'bg-physique-600/[0.10] text-physique-700 ring-physique-600/20 dark:bg-physique-300/15 dark:text-physique-300',
    },
];

const ATOUTS: { titre: string; texte: string; icone: LucideIcon }[] = [
    {
        titre: 'Des cours courts et clairs',
        texte: 'Une notion à la fois, des exemples tirés de la vie en Guinée, des formules bien écrites.',
        icone: BookOpen,
    },
    {
        titre: 'Les annales, corrigées pas à pas',
        texte: 'Les sujets des sessions passées, avec leur provenance et un corrigé étape par étape.',
        icone: FileCheck2,
    },
    {
        titre: 'Des examens blancs chronométrés',
        texte: 'La répétition du jour J : le temps de l’épreuve, puis la note et le détail.',
        icone: Timer,
    },
    {
        titre: 'Hors ligne, économe en données',
        texte: 'Téléchargez un cours quand vous avez du réseau, révisez-le plus tard, sans connexion.',
        icone: WifiOff,
    },
];

const PROMESSES = [
    'Annales corrigées depuis 2010',
    'Cours disponibles hors ligne',
    'Pensé pour les petits forfaits',
];

/**
 * Accueil public, version de socle (lot 0). La vitrine finale — démo jouable,
 * compte à rebours national, tarifs, partenaires — arrive au lot 8.
 * Vouvoiement (DESIGN.md § 9). Aucun chiffre ni témoignage non sourcé.
 */
export default function Accueil() {
    return (
        <>
            <Head title="Réviser le CEE, le BEPC et le Baccalauréat" />

            {/* Héros */}
            <section className="relative isolate overflow-hidden">
                <div
                    aria-hidden
                    className="absolute inset-0 -z-10 halo-marque"
                />
                <div
                    aria-hidden
                    className="absolute inset-0 -z-10 trame-points"
                />
                <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-12 pb-16 sm:px-6 sm:pt-16 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:pt-20 lg:pb-24">
                    <div className="grid justify-items-start gap-6">
                        <p className="inline-flex items-center gap-2 rounded-full border bg-card/70 py-1 pr-3 pl-1.5 text-aide text-ink-600 shadow-xs backdrop-blur-sm">
                            <span className="rounded-full bg-nimba-600 px-2 py-0.5 text-meta font-medium text-white">
                                Guinée
                            </span>
                            CEE · BEPC · Baccalauréat unique
                        </p>
                        <h1 className="text-[2.5rem] leading-[1.04] tracking-[-0.035em] sm:text-[3.25rem] lg:text-vitrine">
                            Un soir, quinze minutes,{' '}
                            <span className="font-accent font-normal tracking-[-0.01em] text-nimba-600 italic dark:text-nimba-300">
                                et je sais où j'en suis.
                            </span>
                        </h1>
                        <p className="max-w-xl text-base text-ink-600 sm:text-[1.0625rem] sm:leading-relaxed">
                            Cours, annales corrigées, exercices et examens
                            blancs pour préparer les examens nationaux guinéens
                            — sur téléphone, même avec peu de données.
                        </p>
                        <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row">
                            <Button asChild taille="grande">
                                <Link href={register()} prefetch>
                                    Créer un compte gratuit
                                    <ArrowRight aria-hidden />
                                </Link>
                            </Button>
                            <Button asChild variant="outline" taille="grande">
                                <Link href={login()} prefetch>
                                    J'ai déjà un compte
                                </Link>
                            </Button>
                        </div>
                        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-aide text-ink-600">
                            {PROMESSES.map((promesse) => (
                                <li
                                    key={promesse}
                                    className="flex items-center gap-1.5"
                                >
                                    <Check
                                        aria-hidden
                                        className="size-3.5 text-nimba-600 dark:text-nimba-300"
                                        strokeWidth={3}
                                    />
                                    {promesse}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <ApercuApplication className="lg:justify-self-end" />
                </div>
            </section>

            {/* Les examens */}
            <section
                aria-labelledby="titre-examens"
                className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6"
            >
                <EnTeteSection
                    sur="Pour les classes d'examen"
                    titre="Un parcours pour chaque examen national"
                    id="titre-examens"
                />
                <ul className="grid gap-3 md:grid-cols-3">
                    {EXAMENS.map((examen) => (
                        <li
                            key={examen.nom}
                            className="group flex items-start gap-4 rounded-carte border bg-card p-5 shadow-carte transition-shadow hover:shadow-releve md:grid"
                        >
                            <span
                                aria-hidden
                                className={cn(
                                    'flex size-10 shrink-0 items-center justify-center rounded-[12px] ring-1 ring-inset',
                                    examen.tuile,
                                )}
                            >
                                <examen.icone className="size-5" />
                            </span>
                            <span className="grid gap-1">
                                <span className="text-titre-carte font-semibold tracking-tight">
                                    {examen.nom}
                                </span>
                                <span className="text-aide font-medium text-ink-500">
                                    {examen.niveau}
                                </span>
                                <span className="mt-1 text-ink-600">
                                    {examen.detail}
                                </span>
                            </span>
                        </li>
                    ))}
                </ul>
            </section>

            {/* Les atouts */}
            <section
                aria-labelledby="titre-atouts"
                className="border-y bg-card"
            >
                <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6">
                    <EnTeteSection
                        sur="Tout pour le jour J"
                        titre="Réviser mieux, pas plus longtemps"
                        id="titre-atouts"
                    />
                    <ul className="grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
                        {ATOUTS.map((atout) => (
                            <li
                                key={atout.titre}
                                className="grid content-start gap-3"
                            >
                                <span
                                    aria-hidden
                                    className="flex size-9 items-center justify-center rounded-[10px] bg-ink-900 text-craie-50"
                                >
                                    <atout.icone className="size-[18px]" />
                                </span>
                                <span className="grid gap-1">
                                    <span className="font-semibold tracking-tight">
                                        {atout.titre}
                                    </span>
                                    <span className="text-ink-600">
                                        {atout.texte}
                                    </span>
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            </section>

            {/* Appel final */}
            <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
                <div className="relative isolate overflow-hidden rounded-[28px] surface-marque px-6 py-12 text-white sm:px-12 sm:py-14">
                    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                        <div className="grid gap-2">
                            <h2 className="text-[1.75rem] leading-tight tracking-[-0.03em] sm:text-[2.25rem]">
                                Votre première séance{' '}
                                <span className="font-accent font-normal tracking-normal text-soleil-300 italic">
                                    commence ce soir.
                                </span>
                            </h2>
                            <p className="max-w-lg text-white/75">
                                Un numéro de téléphone suffit pour créer un
                                compte. Moins d'une minute.
                            </p>
                        </div>
                        <Button
                            asChild
                            taille="grande"
                            className="bg-white text-nimba-700 shadow-flottant hover:bg-white/90 dark:hover:bg-white/90"
                        >
                            <Link href={register()} prefetch>
                                Créer un compte
                                <ArrowRight aria-hidden />
                            </Link>
                        </Button>
                    </div>
                </div>
            </section>
        </>
    );
}

function EnTeteSection({
    sur,
    titre,
    id,
}: {
    sur: string;
    titre: string;
    id: string;
}) {
    return (
        <div className="grid max-w-2xl gap-2">
            <p className="text-aide font-medium text-nimba-700 dark:text-nimba-300">
                {sur}
            </p>
            <h2
                id={id}
                className="text-[1.75rem] leading-tight tracking-[-0.03em] sm:text-[2rem]"
            >
                {titre}
            </h2>
        </div>
    );
}
