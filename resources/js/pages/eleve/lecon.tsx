import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    BookmarkCheck,
    Check,
    ChevronLeft,
    Clock,
    Download,
    Play,
    RotateCcw,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ContenuBlocs } from '@/components/contenu/contenu-blocs';
import { ExerciceQuestion } from '@/components/questions/exercice-question';
import { SignalerErreur } from '@/components/signaler-erreur';
import { BandeauExemple } from '@/components/ui/bandeau-exemple';
import { Button } from '@/components/ui/button';
import { ProgressionBarre } from '@/components/ui/progression';
import type { DocumentBlocs } from '@/lib/contenu/blocs';
import type { QuestionEleve } from '@/lib/contenu/questions';
import { enregistrer } from '@/lib/hors-ligne';
import type { CleMatiere } from '@/lib/matieres';
import { MATIERES } from '@/lib/matieres';
import { cn } from '@/lib/utils';
import { fiche } from '@/routes/eleve/chapitres';
import { matiere as pageMatiere } from '@/routes/eleve/cours';
import { show as pageLecon } from '@/routes/eleve/lecons';
import { commencer } from '@/routes/eleve/seance';

/** L'objet de contenu : le même vient du serveur ou d'un pack (HORS_LIGNE.md A.4). */
export type ContenuLecon = {
    type: 'lecon';
    uuid: string;
    version: number;
    titre: string;
    blocs: DocumentBlocs;
    minutes: number;
    est_exemple: boolean;
    /** Mini-questions de la leçon (version publiée), par identifiant. */
    questions?: Record<string, QuestionEleve>;
};

type Lien = { uuid: string; titre: string };

type Props = {
    lecon: ContenuLecon;
    contexte: {
        matiere: { cle: CleMatiere; nom: string; slug: string };
        chapitre: { id: number; titre: string };
        notion: string;
        rang: number;
        total: number;
        precedente: Lien | null;
        suivante: Lien | null;
    };
    progression: { etat: 'comprise' | 'a_revoir' | null; position: number };
    /** « pack » quand l'écran est lu depuis un téléchargement. */
    source?: 'pack';
};

/** Paliers de lecture envoyés : pas une opération par pixel défilé. */
const PALIERS = [25, 50, 75, 100];

/**
 * Une leçon (PLAN M4) : lecture confortable sur 360 px, taille de texte
 * réglable (« Mon compte › Affichage »), « Compris / À revoir », reprise là
 * où l'élève s'est arrêté. L'écran reçoit un objet de contenu et ne sait pas
 * d'où il vient ; chaque geste passe par la file (`lecon.progression`).
 */
export default function Lecon({ lecon, contexte, progression, source }: Props) {
    const matiere = MATIERES[contexte.matiere.cle];
    const [etat, setEtat] = useState(progression.etat);
    const [position, setPosition] = useState(progression.position);
    const envoyee = useRef(progression.position);
    const article = useRef<HTMLElement>(null);

    // Ouverture : la leçon entre dans « Reprendre » ; puis un geste par palier.
    useEffect(() => {
        void enregistrer({
            type: 'lecon.progression',
            charge: { lecon: lecon.uuid, position: progression.position },
            priorite: 3,
        });

        // Reprendre là où l'élève s'était arrêté.
        if (
            progression.position > 0 &&
            progression.position < 100 &&
            article.current
        ) {
            const { top, height } = article.current.getBoundingClientRect();
            window.scrollTo({
                top:
                    window.scrollY +
                    top +
                    (height * progression.position) / 100 -
                    window.innerHeight / 2,
            });
        }

        const mesurer = () => {
            const element = article.current;

            if (!element) {
                return;
            }

            const { top, height } = element.getBoundingClientRect();
            const lu = Math.round(
                Math.min(
                    1,
                    Math.max(
                        0,
                        (window.innerHeight - top) / Math.max(1, height),
                    ),
                ) * 100,
            );
            const palier = [...PALIERS].reverse().find((p) => lu >= p) ?? 0;

            if (palier > envoyee.current) {
                envoyee.current = palier;
                setPosition(palier);
                void enregistrer({
                    type: 'lecon.progression',
                    charge: { lecon: lecon.uuid, position: palier },
                    priorite: 3,
                });
            }
        };

        mesurer();
        window.addEventListener('scroll', mesurer, { passive: true });

        return () => window.removeEventListener('scroll', mesurer);
        // Une fois par leçon ouverte.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lecon.uuid]);

    function marquer(nouvel: 'comprise' | 'a_revoir') {
        const valeur = etat === nouvel ? null : nouvel;
        setEtat(valeur);
        void enregistrer({
            type: 'lecon.progression',
            charge: { lecon: lecon.uuid, etat: valeur ?? 'aucun' },
            priorite: 3,
        });
    }

    return (
        <>
            <Head title={lecon.titre} />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-10">
                <div className="grid min-w-0 content-start gap-6">
                    <header className="grid gap-4">
                        <Link
                            href={pageMatiere(contexte.matiere.slug)}
                            prefetch
                            className="-ml-1 flex items-center gap-1 self-start rounded-controle px-1 text-aide font-medium text-ink-600 outline-none hover:text-ink-900 focus-visible:outline-2 focus-visible:outline-ring"
                        >
                            <ChevronLeft aria-hidden className="size-4" />
                            {contexte.matiere.nom}
                        </Link>
                        <div className="grid gap-2.5">
                            <p className="flex min-w-0 items-center gap-2 text-aide font-medium">
                                <span
                                    aria-hidden
                                    className={cn(
                                        'flex size-6 shrink-0 items-center justify-center rounded-[7px]',
                                        matiere.tuile,
                                    )}
                                >
                                    <matiere.icone className="size-3.5" />
                                </span>
                                <span className={cn('truncate', matiere.texte)}>
                                    {contexte.chapitre.titre}
                                </span>
                            </p>
                            <h1 className="text-[1.75rem] leading-tight font-semibold text-balance lg:text-[2rem]">
                                {lecon.titre}
                            </h1>
                            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-aide text-ink-500">
                                <span className="flex items-center gap-1.5">
                                    <Clock aria-hidden className="size-3.5" />
                                    {lecon.minutes} min de lecture
                                </span>
                                <span>
                                    Leçon {contexte.rang} sur {contexte.total}
                                </span>
                                {source === 'pack' && (
                                    <span className="flex items-center gap-1.5">
                                        <Download
                                            aria-hidden
                                            className="size-3.5"
                                        />
                                        Lue depuis ton téléchargement
                                    </span>
                                )}
                            </p>
                        </div>
                        {lecon.est_exemple && <BandeauExemple />}
                    </header>

                    <article
                        ref={article}
                        className="rounded-carte border bg-card px-5 py-6 shadow-carte sm:px-8 sm:py-8"
                    >
                        <ContenuBlocs
                            doc={lecon.blocs}
                            className="max-w-[42rem]"
                            rendreQuestion={(uuid) => {
                                const question = lecon.questions?.[uuid];

                                return question ? (
                                    <ExerciceQuestion
                                        question={question}
                                        envoyer
                                        className="my-2 bg-craie-50 shadow-none dark:bg-relief/40"
                                    />
                                ) : null;
                            }}
                        />
                    </article>

                    <Marquage
                        etat={etat}
                        marquer={marquer}
                        className="lg:hidden"
                    />

                    <SignalerErreur
                        cible="lecon"
                        uuid={lecon.uuid}
                        version={lecon.version}
                        className="-mt-2"
                    />

                    <nav
                        aria-label="Leçons du chapitre"
                        className="grid gap-3 sm:grid-cols-2"
                    >
                        {contexte.precedente ? (
                            <LienVoisine
                                lien={contexte.precedente}
                                sens="precedente"
                            />
                        ) : (
                            <span className="max-sm:hidden" />
                        )}
                        {contexte.suivante && (
                            <LienVoisine
                                lien={contexte.suivante}
                                sens="suivante"
                            />
                        )}
                    </nav>
                </div>

                <aside className="grid content-start gap-5 lg:sticky lg:top-10 lg:self-start">
                    <section className="rounded-carte border bg-card p-5 shadow-carte">
                        <h2 className="text-[0.9375rem]">Ma lecture</h2>
                        <p className="mt-3 flex items-baseline gap-1">
                            <span className="text-[1.75rem] leading-none font-bold font-data">
                                {position}
                            </span>
                            <span className="font-semibold text-ink-500">
                                %
                            </span>
                            <span className="ml-1 text-aide text-ink-500">
                                lus
                            </span>
                        </p>
                        <ProgressionBarre
                            valeur={position}
                            libelle={`Leçon lue à ${position} %`}
                            couleur={matiere.plein}
                            className="mt-3"
                        />
                        <Marquage
                            etat={etat}
                            marquer={marquer}
                            className="mt-5 max-lg:hidden"
                        />
                    </section>

                    <section className="grid gap-3 rounded-carte border bg-card p-5 shadow-carte">
                        <h2 className="text-[0.9375rem]">
                            Pour aller plus loin
                        </h2>
                        <Button
                            asChild
                            variant="outline"
                            className="justify-start"
                        >
                            <Link href={fiche(contexte.chapitre.id)} prefetch>
                                <BookmarkCheck aria-hidden />
                                Fiche de révision du chapitre
                            </Link>
                        </Button>
                        <Button
                            variant="doux"
                            className="justify-start"
                            onClick={() => router.post(commencer.url())}
                        >
                            <Play aria-hidden className="fill-current" />
                            M'entraîner : séance du jour
                        </Button>
                    </section>
                </aside>
            </div>
        </>
    );
}

function Marquage({
    etat,
    marquer,
    className,
}: {
    etat: Props['progression']['etat'];
    marquer: (etat: 'comprise' | 'a_revoir') => void;
    className?: string;
}) {
    return (
        <div className={cn('grid gap-2', className)}>
            <p className="text-aide font-medium text-ink-600">
                Où en es-tu avec cette leçon&nbsp;?
            </p>
            <div className="grid grid-cols-2 gap-2">
                <button
                    type="button"
                    aria-pressed={etat === 'comprise'}
                    onClick={() => marquer('comprise')}
                    className={cn(
                        'flex h-11 items-center justify-center gap-2 rounded-controle border text-interface font-medium transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                        etat === 'comprise'
                            ? 'border-juste-600 bg-juste-600/[0.10] text-juste-700 dark:border-juste-400 dark:bg-juste-400/15 dark:text-juste-400'
                            : 'border-contour bg-card text-ink-900 hover:border-ink-400',
                    )}
                >
                    <Check aria-hidden className="size-4" strokeWidth={2.5} />
                    Compris
                </button>
                <button
                    type="button"
                    aria-pressed={etat === 'a_revoir'}
                    onClick={() => marquer('a_revoir')}
                    className={cn(
                        'flex h-11 items-center justify-center gap-2 rounded-controle border text-interface font-medium transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                        etat === 'a_revoir'
                            ? 'border-soleil-500 bg-soleil-400/[0.16] text-soleil-800 dark:border-soleil-400 dark:bg-soleil-400/15 dark:text-soleil-300'
                            : 'border-contour bg-card text-ink-900 hover:border-ink-400',
                    )}
                >
                    <RotateCcw aria-hidden className="size-4" />
                    À revoir
                </button>
            </div>
        </div>
    );
}

function LienVoisine({
    lien,
    sens,
}: {
    lien: Lien;
    sens: 'precedente' | 'suivante';
}) {
    const suivante = sens === 'suivante';

    return (
        <Link
            href={pageLecon(lien.uuid)}
            prefetch
            className={cn(
                'group flex items-center gap-3 rounded-carte border bg-card p-4 shadow-xs transition-colors outline-none hover:border-ink-400 focus-visible:outline-2 focus-visible:outline-ring',
                suivante && 'sm:col-start-2 sm:flex-row-reverse sm:text-right',
            )}
        >
            <span
                aria-hidden
                className="flex size-9 shrink-0 items-center justify-center rounded-full border border-contour text-ink-600 group-hover:text-ink-900"
            >
                {suivante ? (
                    <ArrowRight className="size-4" />
                ) : (
                    <ArrowLeft className="size-4" />
                )}
            </span>
            <span className="grid min-w-0 gap-0.5">
                <span className="text-meta text-ink-500">
                    {suivante ? 'Leçon suivante' : 'Leçon précédente'}
                </span>
                <span className="truncate font-semibold">{lien.titre}</span>
            </span>
        </Link>
    );
}
