import { Head, Link } from '@inertiajs/react';
import { BookOpen, Check, CloudUpload, Flame, House, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ContenuBlocs } from '@/components/contenu/contenu-blocs';
import { PastilleReseau } from '@/components/hors-ligne/pastille-reseau';
import { BandeauExemple } from '@/components/ui/bandeau-exemple';
import { Button } from '@/components/ui/button';
import type { EtatChoix } from '@/components/ui/choix';
import { Choix, GroupeChoix } from '@/components/ui/choix';
import { Formule } from '@/components/ui/formule';
import { ProgressionSegments } from '@/components/ui/progression';
import { corriger } from '@/lib/contenu/questions';
import type { QuestionSeance } from '@/lib/contenu/questions';
import { base, enregistrer, useHorsLigne } from '@/lib/hors-ligne';
import type { CleMatiere } from '@/lib/matieres';
import { MATIERES } from '@/lib/matieres';
import { cn } from '@/lib/utils';
import { accueil, cours } from '@/routes/eleve';

type Reponse = { question: string; option: string; correcte: boolean };

type Props = {
    seance: { uuid: string; duree_minutes: number; terminee: boolean };
    questions: QuestionSeance[];
    reponses: Reponse[];
};

const LETTRES = ['A', 'B', 'C', 'D', 'E', 'F'];

/**
 * La séance du jour dans « l'ardoise » (DESIGN.md § 6.4) : plein écran, une
 * question à la fois, « Vérifier » collé en bas, puis le verdict (icône +
 * mot + couleur) et l'explication.
 *
 * **Chaque réponse part par la file d'opérations** (`tentative.enregistrer`,
 * HORS_LIGNE.md A.6), en ligne comme hors ligne : la correction affichée ici
 * est celle de l'appareil, le serveur recorrige. Une séance rouverte reprend
 * à la première question sans réponse, réponses encore en file comprises.
 */
export default function Seance({ seance, questions, reponses }: Props) {
    const [donnees, setDonnees] = useState<Reponse[]>(reponses);
    const [pretes, setPretes] = useState(false);
    const [choix, setChoix] = useState<string | null>(null);
    const [verifiee, setVerifiee] = useState<Reponse | null>(null);
    const debut = useRef(Date.now());
    const finEnvoyee = useRef(seance.terminee);

    // Réponses données sur ce téléphone mais pas encore reçues par le serveur.
    useEffect(() => {
        let actif = true;

        void base.operations
            .toArray()
            .then((operations) => {
                if (!actif) {
                    return;
                }

                const locales = operations
                    .filter(
                        (o) =>
                            o.type === 'tentative.enregistrer' &&
                            o.charge.seance === seance.uuid,
                    )
                    .map((o) => {
                        const question = questions.find(
                            (q) => q.uuid === o.charge.question,
                        );
                        const option = String(
                            (o.charge.reponse as { option?: string })?.option ??
                                '',
                        );

                        return {
                            question: String(o.charge.question),
                            option,
                            correcte: question
                                ? corriger(question.type, question.attendue, {
                                      option,
                                  })
                                : false,
                        };
                    });

                setDonnees((deja) => [
                    ...deja,
                    ...locales.filter(
                        (l) => !deja.some((d) => d.question === l.question),
                    ),
                ]);
            })
            .catch(() => undefined)
            .finally(() => actif && setPretes(true));

        return () => {
            actif = false;
        };
    }, [seance.uuid, questions]);

    const repondues = useMemo(
        () => new Set(donnees.map((d) => d.question)),
        [donnees],
    );
    const courante = verifiee
        ? questions.find((q) => q.uuid === verifiee.question)
        : questions.find((q) => !repondues.has(q.uuid));
    const rang = courante ? questions.indexOf(courante) + 1 : questions.length;
    const terminee = pretes && !courante;
    const justes = donnees.filter((d) => d.correcte).length;

    // Fin de séance : un geste de la file, une seule fois.
    useEffect(() => {
        if (terminee && !finEnvoyee.current) {
            finEnvoyee.current = true;
            void enregistrer({
                type: 'seance.terminer',
                charge: { seance: seance.uuid },
                priorite: 2,
            });
        }
    }, [terminee, seance.uuid]);

    function verifier() {
        if (!courante || choix === null) {
            return;
        }

        const reponse = {
            question: courante.uuid,
            option: choix,
            correcte: corriger(courante.type, courante.attendue, {
                option: choix,
            }),
        };

        setVerifiee(reponse);
        setDonnees((deja) => [...deja, reponse]);
        void enregistrer({
            type: 'tentative.enregistrer',
            charge: {
                question: courante.uuid,
                version: courante.version,
                reponse: { option: choix },
                seance: seance.uuid,
                duree_secondes: Math.min(
                    65535,
                    Math.round((Date.now() - debut.current) / 1000),
                ),
            },
            priorite: 1,
        });
    }

    function continuer() {
        setVerifiee(null);
        setChoix(null);
        debut.current = Date.now();
        window.scrollTo({ top: 0 });
    }

    const exemple = questions.some((q) => q.est_exemple);

    return (
        <>
            <Head title="Séance du jour" />
            <div className="flex min-h-dvh flex-col bg-background">
                <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur-md">
                    <div className="mx-auto flex h-14 w-full max-w-2xl items-center gap-3 px-4">
                        <Link
                            href={accueil()}
                            aria-label="Quitter la séance"
                            className="-ml-2 flex size-10 shrink-0 items-center justify-center rounded-full text-ink-600 outline-none hover:bg-ink-900/[0.05] hover:text-ink-900 focus-visible:outline-2 focus-visible:outline-ring dark:hover:bg-white/[0.06]"
                        >
                            <X aria-hidden className="size-5" />
                        </Link>
                        <ProgressionSegments
                            valeur={
                                (repondues.size /
                                    Math.max(1, questions.length)) *
                                100
                            }
                            segments={questions.length}
                            libelle={`Question ${rang} sur ${questions.length}`}
                            className="flex-1"
                        />
                        <span className="shrink-0 text-aide font-semibold text-ink-900 font-data">
                            {Math.min(rang, questions.length)}/
                            {questions.length}
                        </span>
                        <PastilleReseau className="max-sm:hidden" />
                    </div>
                </header>

                <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pt-6 pb-6">
                    {exemple && <BandeauExemple className="mb-5" />}
                    {!pretes ? null : terminee ? (
                        <Bilan
                            justes={justes}
                            total={questions.length}
                            duree={seance.duree_minutes}
                        />
                    ) : (
                        courante && (
                            <Ardoise
                                key={courante.uuid}
                                question={courante}
                                choix={choix}
                                verifiee={verifiee}
                                choisir={setChoix}
                            />
                        )
                    )}
                </main>

                {pretes && !terminee && courante && (
                    <BarreAction
                        verifiee={verifiee}
                        peutVerifier={choix !== null}
                        verifier={verifier}
                        continuer={continuer}
                        derniere={repondues.size >= questions.length}
                        question={courante}
                    />
                )}
            </div>
        </>
    );
}

function Ardoise({
    question,
    choix,
    verifiee,
    choisir,
}: {
    question: QuestionSeance;
    choix: string | null;
    verifiee: Reponse | null;
    choisir: (option: string) => void;
}) {
    const matiere = MATIERES[question.matiere as CleMatiere];

    function etat(option: string): EtatChoix {
        if (!verifiee) {
            return choix === option ? 'selectionne' : 'neutre';
        }

        if (option === question.attendue.option) {
            return option === verifiee.option ? 'juste' : 'bonne_reponse';
        }

        return option === verifiee.option ? 'faux' : 'ecartee';
    }

    return (
        <div className="grid gap-6">
            <div className="grid gap-3">
                <p className="flex min-w-0 items-center gap-2 text-aide font-medium">
                    {matiere && (
                        <span
                            aria-hidden
                            className={cn(
                                'flex size-6 shrink-0 items-center justify-center rounded-[7px]',
                                matiere.tuile,
                            )}
                        >
                            <matiere.icone className="size-3.5" />
                        </span>
                    )}
                    <span className={cn('shrink-0', matiere?.texte)}>
                        {question.matiere_nom}
                    </span>
                    <span aria-hidden className="text-ink-400">
                        ·
                    </span>
                    <span className="truncate text-ink-500">
                        {question.notion}
                    </span>
                </p>
                <ContenuBlocs doc={question.enonce} />
            </div>

            <GroupeChoix libelle="Réponses proposées">
                {question.options.map((option, rang) => (
                    <Choix
                        key={option.id}
                        lettre={LETTRES[rang] ?? option.id.toUpperCase()}
                        etat={etat(option.id)}
                        onChoisir={() => choisir(option.id)}
                    >
                        {option.texte}
                        {option.latex && (
                            <Formule
                                latex={option.latex}
                                libelle={option.latex}
                                className={option.texte ? 'ml-1.5' : undefined}
                            />
                        )}
                    </Choix>
                ))}
            </GroupeChoix>
        </div>
    );
}

/**
 * Le bas de l'ardoise : « Vérifier », puis la feuille du verdict — icône +
 * mot + couleur, l'explication, « Continuer ». Annoncée aux lecteurs d'écran.
 */
function BarreAction({
    verifiee,
    peutVerifier,
    verifier,
    continuer,
    derniere,
    question,
}: {
    verifiee: Reponse | null;
    peutVerifier: boolean;
    verifier: () => void;
    continuer: () => void;
    derniere: boolean;
    question: QuestionSeance;
}) {
    const bouton = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (verifiee) {
            bouton.current?.focus();
        }
    }, [verifiee]);

    return (
        <div className="sticky bottom-0 z-20 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-12px_rgb(16_16_24/0.18)] backdrop-blur-md">
            <div className="mx-auto grid w-full max-w-2xl gap-4 px-4 py-4">
                <div aria-live="polite" className="empty:hidden">
                    {verifiee && (
                        <div className="grid gap-3">
                            <p
                                className={cn(
                                    'flex items-center gap-2.5 text-titre-carte font-semibold',
                                    verifiee.correcte
                                        ? 'text-juste-700 dark:text-juste-400'
                                        : 'text-faux-600 dark:text-faux-400',
                                )}
                            >
                                <span
                                    aria-hidden
                                    className={cn(
                                        'flex size-8 items-center justify-center rounded-full text-white',
                                        verifiee.correcte
                                            ? 'bg-juste-600 dark:bg-juste-400 dark:text-[#110e0b]'
                                            : 'bg-faux-600 dark:bg-faux-400 dark:text-[#110e0b]',
                                    )}
                                >
                                    {verifiee.correcte ? (
                                        <Check
                                            className="size-4"
                                            strokeWidth={3}
                                        />
                                    ) : (
                                        <X className="size-4" strokeWidth={3} />
                                    )}
                                </span>
                                {verifiee.correcte ? 'Juste !' : 'Pas encore'}
                            </p>
                            {question.explication && (
                                <ContenuBlocs
                                    doc={question.explication}
                                    className="max-h-[35dvh] overflow-y-auto text-interface text-ink-600"
                                />
                            )}
                        </div>
                    )}
                </div>
                {verifiee ? (
                    <Button
                        ref={bouton}
                        taille="grande"
                        className="w-full"
                        onClick={continuer}
                    >
                        {derniere ? 'Voir mon bilan' : 'Continuer'}
                    </Button>
                ) : (
                    <Button
                        taille="grande"
                        className="w-full"
                        disabled={!peutVerifier}
                        onClick={verifier}
                    >
                        Vérifier
                    </Button>
                )}
            </div>
        </div>
    );
}

function Bilan({
    justes,
    total,
    duree,
}: {
    justes: number;
    total: number;
    duree: number;
}) {
    const { enAttente } = useHorsLigne();
    const pourcentage = Math.round((justes / Math.max(1, total)) * 100);

    return (
        <div className="grid flex-1 content-center justify-items-center gap-6 py-6 text-center">
            <span
                aria-hidden
                className="flex size-16 items-center justify-center rounded-full bg-nimba-500/[0.12] text-nimba-600 dark:bg-nimba-400/15 dark:text-nimba-400"
            >
                <Flame className="size-8 fill-current" />
            </span>
            <div className="grid gap-2">
                <h1 className="text-[1.75rem] leading-tight titre-contraste">
                    Séance terminée. <strong>Bravo.</strong>
                </h1>
                <p className="text-ink-600">
                    Ta séance de {duree} minutes compte pour ta série de jours.
                </p>
            </div>
            <p className="flex items-baseline gap-1.5">
                <span className="text-[3rem] leading-none font-bold font-data">
                    {justes}
                </span>
                <span className="text-lg font-semibold text-ink-500 font-data">
                    / {total}
                </span>
                <span className="sr-only">réponses justes</span>
            </p>
            <div className="w-full max-w-xs">
                <ProgressionSegments
                    valeur={pourcentage}
                    segments={total}
                    libelle={`${justes} réponses justes sur ${total}`}
                    couleur="bg-juste-600 dark:bg-juste-400"
                />
            </div>
            {enAttente > 0 && (
                <p className="flex items-center gap-2 rounded-controle bg-craie-100 px-3 py-2 text-aide text-ink-600 dark:bg-relief/60">
                    <CloudUpload aria-hidden className="size-4" />
                    Tes réponses sont gardées sur le téléphone et partiront
                    toutes seules.
                </p>
            )}
            <div className="grid w-full max-w-xs gap-2.5">
                <Button asChild taille="grande">
                    <Link href={accueil()}>
                        <House aria-hidden />
                        Retour à l'accueil
                    </Link>
                </Button>
                <Button asChild variant="outline" taille="grande">
                    <Link href={cours()}>
                        <BookOpen aria-hidden />
                        Revoir le cours
                    </Link>
                </Button>
            </div>
        </div>
    );
}
