import { Head, Link } from '@inertiajs/react';
import { BookOpen, CloudUpload, Flame, House, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ContenuBlocs } from '@/components/contenu/contenu-blocs';
import { PastilleReseau } from '@/components/hors-ligne/pastille-reseau';
import {
    AutoEvaluation,
    CorrigePasAPas,
    IndicesQuestion,
} from '@/components/questions/aides-question';
import { EnteteQuestion, VerdictQuestion } from '@/components/questions/commun';
import { SignalerErreur } from '@/components/signaler-erreur';
import { SaisieQuestion } from '@/components/questions/saisie-question';
import { BandeauExemple } from '@/components/ui/bandeau-exemple';
import { Button } from '@/components/ui/button';
import { ProgressionSegments } from '@/components/ui/progression';
import type { Reprise, Tentative } from '@/hooks/use-tentative';
import { useTentative } from '@/hooks/use-tentative';
import { corriger, scoreAutoEvaluation } from '@/lib/contenu/questions';
import type { QuestionEleve, ReponseQuestion } from '@/lib/contenu/questions';
import { base, enregistrer, useHorsLigne } from '@/lib/hors-ligne';
import { marquerSeanceTerminee } from '@/lib/progression/locale';
import { accueil, cours } from '@/routes/eleve';

/** Une réponse de la séance : reçue par le serveur, ou encore dans la file. */
type Reponse = {
    question: string;
    /** uuid de la tentative (= celui de son opération dans la file) */
    tentative: string;
    reponse: ReponseQuestion;
    score: number | null;
    auto_evaluee: boolean;
};

type Props = {
    seance: { uuid: string; duree_minutes: number; terminee: boolean };
    questions: QuestionEleve[];
    reponses: Reponse[];
};

/** Terminée : corrigée, et auto-évaluée si la question est ouverte. */
function estTerminee(reponse: Reponse, questions: QuestionEleve[]) {
    const question = questions.find((q) => q.uuid === reponse.question);

    return question?.type !== 'ouverte' || reponse.auto_evaluee;
}

/**
 * La séance du jour dans « l'ardoise » (DESIGN.md § 6.4) : plein écran, une
 * question à la fois — l'un des neuf types —, un indice à la demande,
 * « Vérifier » collé en bas, puis la feuille du verdict (icône + mot +
 * couleur) et le corrigé pas à pas. Question ouverte : l'élève compare sa
 * rédaction au corrigé et coche les critères du barème.
 *
 * **Chaque réponse part par la file d'opérations** (`tentative.enregistrer`,
 * puis `tentative.auto_evaluer` pour une rédaction, HORS_LIGNE.md A.6), en
 * ligne comme hors ligne : la correction affichée ici est celle de
 * l'appareil, le serveur recorrige contre la version vue. Une séance
 * rouverte reprend à la première question pas terminée, réponses encore en
 * file comprises.
 */
export default function Seance({ seance, questions, reponses }: Props) {
    const [donnees, setDonnees] = useState<Reponse[]>(reponses);
    const [pretes, setPretes] = useState(false);
    const [enCours, setEnCours] = useState<string | null>(null);
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

                const evaluations = new Map(
                    operations
                        .filter((o) => o.type === 'tentative.auto_evaluer')
                        .map((o) => [
                            String(o.charge.tentative),
                            (o.charge.criteres as string[]) ?? [],
                        ]),
                );
                const locales: Reponse[] = operations
                    .filter(
                        (o) =>
                            o.type === 'tentative.enregistrer' &&
                            o.charge.seance === seance.uuid,
                    )
                    .flatMap((o) => {
                        const question = questions.find(
                            (q) => q.uuid === o.charge.question,
                        );

                        if (!question) {
                            return [];
                        }

                        const reponse = (o.charge.reponse ??
                            {}) as ReponseQuestion;
                        const criteres = evaluations.get(o.uuid);

                        return [
                            {
                                question: question.uuid,
                                tentative: o.uuid,
                                reponse,
                                score:
                                    criteres !== undefined
                                        ? scoreAutoEvaluation(
                                              question.donnees,
                                              criteres,
                                          )
                                        : corriger(
                                              question.type,
                                              question.attendue,
                                              reponse as Record<
                                                  string,
                                                  unknown
                                              >,
                                          ),
                                auto_evaluee: criteres !== undefined,
                            },
                        ];
                    });

                setDonnees((deja) => {
                    // Une auto-évaluation encore en file complète une
                    // rédaction déjà reçue.
                    const completees = deja.map((d) => {
                        const criteres = evaluations.get(d.tentative);
                        const question = questions.find(
                            (q) => q.uuid === d.question,
                        );

                        return criteres !== undefined &&
                            question &&
                            !d.auto_evaluee
                            ? {
                                  ...d,
                                  auto_evaluee: true,
                                  score: scoreAutoEvaluation(
                                      question.donnees,
                                      criteres,
                                  ),
                              }
                            : d;
                    });

                    return [
                        ...completees,
                        ...locales.filter(
                            (l) =>
                                !completees.some(
                                    (d) => d.question === l.question,
                                ),
                        ),
                    ];
                });
            })
            .catch(() => undefined)
            .finally(() => actif && setPretes(true));

        return () => {
            actif = false;
        };
    }, [seance.uuid, questions]);

    const terminees = useMemo(
        () =>
            new Set(
                donnees
                    .filter((d) => estTerminee(d, questions))
                    .map((d) => d.question),
            ),
        [donnees, questions],
    );
    const courante = enCours
        ? questions.find((q) => q.uuid === enCours)
        : questions.find((q) => !terminees.has(q.uuid));
    const rang = courante ? questions.indexOf(courante) + 1 : questions.length;
    const terminee = pretes && !courante;
    const justes = donnees.filter((d) => d.score === 100).length;
    const enPartie = donnees.filter(
        (d) => d.score !== null && d.score > 0 && d.score < 100,
    ).length;

    // Fin de séance : un geste de la file, une seule fois.
    useEffect(() => {
        if (terminee && !finEnvoyee.current) {
            finEnvoyee.current = true;
            void enregistrer({
                type: 'seance.terminer',
                charge: { seance: seance.uuid },
                priorite: 2,
            });
            // HL4 : hors ligne, « Commencer » passe à la séance préparée suivante.
            void marquerSeanceTerminee(base, seance.uuid);
        }
    }, [terminee, seance.uuid]);

    const exemple = questions.some((q) => q.est_exemple);
    // Rédaction déjà envoyée mais pas encore auto-évaluée : reprise à la feuille.
    const reprise = courante
        ? donnees.find((d) => d.question === courante.uuid)
        : undefined;

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
                                (terminees.size /
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

                {!pretes ? null : terminee ? (
                    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pt-6 pb-6">
                        {exemple && <BandeauExemple className="mb-5" />}
                        <Bilan
                            justes={justes}
                            enPartie={enPartie}
                            total={questions.length}
                            duree={seance.duree_minutes}
                        />
                    </main>
                ) : (
                    courante && (
                        <Ardoise
                            key={courante.uuid}
                            question={courante}
                            exemple={exemple}
                            reprise={reprise}
                            seance={seance.uuid}
                            derniere={questions.every(
                                (q) =>
                                    q.uuid === courante.uuid ||
                                    terminees.has(q.uuid),
                            )}
                            commencer={() => setEnCours(courante.uuid)}
                            repondre={(reponse) =>
                                setDonnees((deja) => [
                                    ...deja.filter(
                                        (d) => d.question !== reponse.question,
                                    ),
                                    reponse,
                                ])
                            }
                            continuer={() => {
                                setEnCours(null);
                                window.scrollTo({ top: 0 });
                            }}
                        />
                    )
                )}
            </div>
        </>
    );
}

function Ardoise({
    question,
    exemple,
    reprise,
    seance,
    derniere,
    commencer,
    repondre,
    continuer,
}: {
    question: QuestionEleve;
    exemple: boolean;
    reprise?: Reponse;
    seance: string;
    derniere: boolean;
    commencer: () => void;
    repondre: (reponse: Reponse) => void;
    continuer: () => void;
}) {
    const tentative = useTentative(
        question,
        reprise
            ? ({
                  reponse: reprise.reponse,
                  score: reprise.score,
                  auto_evaluee: reprise.auto_evaluee,
              } satisfies Reprise)
            : undefined,
    );
    const debut = useRef(Date.now());
    const uuid = useRef<string | null>(reprise?.tentative ?? null);

    async function verifier() {
        commencer();
        const score = tentative.verifier();
        // Le geste est gardé dans la file avant d'être affiché comme répondu ;
        // s'il ne peut pas l'être (aucun profil actif), la séance avance quand même.
        const tentativeUuid = await enregistrer({
            type: 'tentative.enregistrer',
            charge: {
                question: question.uuid,
                version: question.version,
                reponse: tentative.reponse,
                seance,
                duree_secondes: Math.min(
                    65535,
                    Math.round((Date.now() - debut.current) / 1000),
                ),
                indices_utilises: tentative.indicesVus,
            },
            priorite: 1,
        }).catch(() => '');

        uuid.current = tentativeUuid;
        repondre({
            question: question.uuid,
            tentative: tentativeUuid,
            reponse: tentative.reponse,
            score,
            auto_evaluee: false,
        });
    }

    function valider() {
        commencer();
        const score = tentative.valider();
        const tentativeUuid = uuid.current;

        if (tentativeUuid) {
            void enregistrer({
                type: 'tentative.auto_evaluer',
                charge: {
                    tentative: tentativeUuid,
                    criteres: tentative.criteres,
                },
                priorite: 1,
                depend_de: tentativeUuid,
            });
            repondre({
                question: question.uuid,
                tentative: tentativeUuid,
                reponse: tentative.reponse,
                score,
                auto_evaluee: true,
            });
        }
    }

    return (
        <>
            <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pt-6 pb-6">
                {exemple && <BandeauExemple className="mb-5" />}
                <div className="grid gap-6">
                    <div className="grid gap-3">
                        <EnteteQuestion question={question} />
                        <ContenuBlocs doc={question.enonce} />
                    </div>
                    <SaisieQuestion
                        question={question}
                        reponse={tentative.reponse}
                        changer={tentative.changer}
                        corrigee={tentative.verifiee}
                    />
                    <IndicesQuestion
                        indices={question.indices}
                        vus={tentative.indicesVus}
                        voirSuivant={tentative.voirIndice}
                        fige={tentative.verifiee}
                    />
                </div>
            </main>

            <BarreAction
                question={question}
                tentative={tentative}
                derniere={derniere}
                verifier={() => void verifier()}
                valider={valider}
                continuer={continuer}
            />
        </>
    );
}

/**
 * Le bas de l'ardoise : « Vérifier », puis la feuille du verdict — icône +
 * mot + couleur, le corrigé pas à pas, l'auto-évaluation d'une rédaction,
 * « Continuer ». Annoncée aux lecteurs d'écran.
 */
function BarreAction({
    question,
    tentative,
    derniere,
    verifier,
    valider,
    continuer,
}: {
    question: QuestionEleve;
    tentative: Tentative;
    derniere: boolean;
    verifier: () => void;
    valider: () => void;
    continuer: () => void;
}) {
    const bouton = useRef<HTMLButtonElement>(null);
    const feuille = useRef<HTMLDivElement>(null);
    const aEvaluer = tentative.verdict === 'a_evaluer';

    // Chaque nouveau verdict se lit depuis le haut de la feuille.
    useEffect(() => {
        if (tentative.verifiee) {
            feuille.current?.scrollTo({ top: 0 });
            bouton.current?.focus({ preventScroll: true });
        }
    }, [tentative.verifiee, tentative.evaluee]);

    return (
        <div className="sticky bottom-0 z-20 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-12px_rgb(16_16_24/0.18)] backdrop-blur-md">
            <div className="mx-auto grid w-full max-w-2xl gap-4 px-4 py-4">
                <div aria-live="polite" className="empty:hidden">
                    {tentative.verdict && (
                        <div
                            ref={feuille}
                            className="grid max-h-[48dvh] gap-4 overflow-y-auto overscroll-contain"
                        >
                            <VerdictQuestion
                                verdict={tentative.verdict}
                                score={tentative.score}
                            />
                            {aEvaluer && (
                                <p className="text-interface text-ink-600">
                                    Lis le corrigé, puis coche ce que ta
                                    rédaction contient vraiment.
                                </p>
                            )}
                            <CorrigePasAPas
                                key={question.uuid}
                                etapes={question.corrige}
                            />
                            {question.type === 'ouverte' && (
                                <AutoEvaluation
                                    bareme={question.donnees.bareme ?? []}
                                    criteres={tentative.criteres}
                                    changer={tentative.setCriteres}
                                    fige={tentative.evaluee}
                                />
                            )}
                            <SignalerErreur
                                cible="question"
                                uuid={question.uuid}
                                version={question.version}
                            />
                        </div>
                    )}
                </div>
                {!tentative.verifiee ? (
                    <Button
                        taille="grande"
                        className="w-full"
                        disabled={!tentative.complete}
                        onClick={verifier}
                    >
                        Vérifier
                    </Button>
                ) : aEvaluer ? (
                    <Button
                        ref={bouton}
                        taille="grande"
                        className="w-full"
                        onClick={valider}
                    >
                        Valider mon auto-évaluation
                    </Button>
                ) : (
                    <Button
                        ref={bouton}
                        taille="grande"
                        className="w-full"
                        onClick={continuer}
                    >
                        {derniere ? 'Voir mon bilan' : 'Continuer'}
                    </Button>
                )}
            </div>
        </div>
    );
}

function Bilan({
    justes,
    enPartie,
    total,
    duree,
}: {
    justes: number;
    enPartie: number;
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
            <div className="grid justify-items-center gap-1">
                <p className="flex items-baseline gap-1.5">
                    <span className="text-[3rem] leading-none font-bold font-data">
                        {justes}
                    </span>
                    <span className="text-lg font-semibold text-ink-500 font-data">
                        / {total}
                    </span>
                    <span className="sr-only">réponses justes</span>
                </p>
                {enPartie > 0 && (
                    <p className="text-aide text-ink-600">
                        et {enPartie} en partie juste{enPartie > 1 ? 's' : ''}
                    </p>
                )}
            </div>
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
