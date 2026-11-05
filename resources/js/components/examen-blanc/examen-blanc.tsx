import { Link, usePage } from '@inertiajs/react';
import {
    ChevronLeft,
    ChevronRight,
    CircleCheck,
    Clock3,
    CloudUpload,
    EyeOff,
    Flag,
    Hourglass,
    Share2,
    Timer,
    TriangleAlert,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ContenuBlocs } from '@/components/contenu/contenu-blocs';
import { PastilleReseau } from '@/components/hors-ligne/pastille-reseau';
import {
    AutoEvaluation,
    CorrigePasAPas,
} from '@/components/questions/aides-question';
import { SaisieQuestion } from '@/components/questions/saisie-question';
import { Button } from '@/components/ui/button';
import { useConfirmer } from '@/components/ui/confirm-provider';
import { ProgressionSegments } from '@/components/ui/progression';
import { Spinner } from '@/components/ui/spinner';
import type { SujetEleve } from '@/lib/contenu/sujets';
import { formaterDuree, questionsDuSujet } from '@/lib/contenu/sujets';
import { partagerCarte } from '@/lib/examen-blanc/carte';
import { formaterNote } from '@/lib/examen-blanc/note';
import type { Note } from '@/lib/examen-blanc/note';
import {
    DUREES_AU_CHOIX,
    allerA,
    clore,
    demarrer,
    dureeConnue,
    envoyer,
    evaluer,
    examenEnCours,
    formaterRestant,
    noter,
    noterHeure,
    repondre,
    tempsRestantMs,
} from '@/lib/examen-blanc/passage';
import type { ExamenLocal, OrigineDuree } from '@/lib/examen-blanc/passage';
import { base, enregistrer, useHorsLigne } from '@/lib/hors-ligne';
import { uuid7 } from '@/lib/hors-ligne/uuid7';
import { MATIERES } from '@/lib/matieres';
import { cn, pluriel } from '@/lib/utils';
import { index as mesExamens, show } from '@/routes/eleve/examens-blancs';

/** Toutes les 15 s, et à chaque retour sur l'écran : l'heure est notée. */
const RYTHME_HEURE_MS = 15_000;

type Etape =
    | { cle: 'lancement' }
    | { cle: 'passage'; examen: ExamenLocal }
    | { cle: 'evaluation'; examen: ExamenLocal }
    | { cle: 'resultat'; examen: ExamenLocal; note: Note };

/**
 * « Conditions réelles » d'une annale (PLAN M7, HORS_LIGNE.md A.8) : le
 * lancement (durée, règles), le passage plein écran (chronomètre discret,
 * pas d'indice, pas de corrigé), l'auto-évaluation des rédactions, puis le
 * résultat affiché tout de suite et envoyé par la file. L'examen vit sur
 * l'appareil (`lib/examen-blanc/passage.ts`) : chaque geste est gardé, un
 * onglet fermé rouvre l'examen à la question en cours.
 */
export function ExamenBlanc({
    sujet,
    dureeEpreuve,
    reprendre,
}: {
    sujet: SujetEleve;
    dureeEpreuve: number | null;
    /** Ouvert par `?mode=examen` : un examen en cours reprend tout seul. */
    reprendre: boolean;
}) {
    const { auth } = usePage().props;
    const auteur = auth.user?.id ?? 0;
    const [etape, setEtape] = useState<Etape>({ cle: 'lancement' });
    const [enCours, setEnCours] = useState<ExamenLocal | null>(null);

    useEffect(() => {
        let actif = true;

        void examenEnCours(base, auteur, sujet.uuid)
            .then((examen) => {
                if (!actif) {
                    return;
                }

                setEnCours(examen);

                if (examen && reprendre) {
                    setEtape(
                        examen.statut === 'en_cours'
                            ? { cle: 'passage', examen }
                            : { cle: 'evaluation', examen },
                    );
                    toast.info('Examen repris, là où tu t’étais arrêté.', {
                        id: 'examen-repris',
                    });
                }
            })
            .catch(() => undefined);

        return () => {
            actif = false;
        };
    }, [auteur, sujet.uuid, reprendre]);

    async function commencer(minutes: number, origine: OrigineDuree) {
        const examen = await demarrer(base, {
            id: uuid7(),
            auteur,
            sujet,
            duree_minutes: minutes,
            origine_duree: origine,
            maintenant: Date.now(),
        });
        setEtape({ cle: 'passage', examen });
    }

    const terminer = useCallback(
        async (examen: ExamenLocal) => {
            const clos = await clore(base, examen.id, Date.now());
            const aEvaluer = sujet.parties.some((p) =>
                p.questions.some(
                    (q) =>
                        q.type === 'ouverte' &&
                        clos.reponses[q.uuid]?.reponse?.texte,
                ),
            );

            if (aEvaluer) {
                setEtape({ cle: 'evaluation', examen: clos });
            } else {
                const { note } = await envoyer(base, enregistrer, clos, sujet);
                setEtape({
                    cle: 'resultat',
                    examen: clos,
                    note: { ...noter(clos, sujet), note },
                });
            }
        },
        [sujet],
    );

    if (etape.cle === 'passage') {
        return (
            <Passage
                sujet={sujet}
                initial={etape.examen}
                terminer={(examen) => void terminer(examen)}
            />
        );
    }

    if (etape.cle === 'evaluation') {
        return (
            <Evaluation
                sujet={sujet}
                initial={etape.examen}
                valider={async (examen) => {
                    await envoyer(base, enregistrer, examen, sujet);
                    setEtape({
                        cle: 'resultat',
                        examen,
                        note: noter(examen, sujet),
                    });
                }}
            />
        );
    }

    if (etape.cle === 'resultat') {
        return (
            <ResultatLocal
                sujet={sujet}
                examen={etape.examen}
                note={etape.note}
            />
        );
    }

    return (
        <Lancement
            sujet={sujet}
            dureeEpreuve={dureeEpreuve}
            enCours={enCours}
            commencer={(m, o) => void commencer(m, o)}
            reprendre={(examen) =>
                setEtape(
                    examen.statut === 'en_cours'
                        ? { cle: 'passage', examen }
                        : { cle: 'evaluation', examen },
                )
            }
        />
    );
}

function Lancement({
    sujet,
    dureeEpreuve,
    enCours,
    commencer,
    reprendre,
}: {
    sujet: SujetEleve;
    dureeEpreuve: number | null;
    enCours: ExamenLocal | null;
    commencer: (minutes: number, origine: OrigineDuree) => void;
    reprendre: (examen: ExamenLocal) => void;
}) {
    const connue = dureeConnue(sujet, dureeEpreuve);
    const [choisie, setChoisie] = useState<number>(DUREES_AU_CHOIX[1]);
    const questions = questionsDuSujet(sujet).length;
    const minutes = connue?.minutes ?? choisie;

    if (enCours) {
        const restant = tempsRestantMs(enCours, Date.now());

        return (
            <section className="grid gap-4 rounded-carte surface-encre p-5 text-white shadow-releve sm:p-6">
                <div className="grid gap-1">
                    <h2 className="text-titre-carte font-semibold">
                        Ton examen est en cours
                    </h2>
                    <p className="text-aide text-white/75">
                        {restant > 0
                            ? `Il te reste ${formaterRestant(restant)}. Le temps a continué de courir, comme le jour de l’examen.`
                            : 'Le temps est écoulé : tes réponses sont gardées. Termine pour voir ta note.'}
                    </p>
                </div>
                <Button
                    className="w-full sm:w-fit"
                    onClick={() => reprendre(enCours)}
                >
                    Reprendre l’examen
                </Button>
            </section>
        );
    }

    return (
        <section className="grid gap-5 rounded-carte surface-encre p-5 text-white shadow-releve sm:p-6">
            <div className="grid gap-1.5">
                <h2 className="text-titre-carte font-semibold">
                    Comme le jour de l’examen
                </h2>
                <p className="text-aide text-white/75">
                    {pluriel(questions, 'question')}, sans indice ni corrigé
                    pendant l’épreuve. Ta note sur 20 s’affiche à la fin.
                </p>
            </div>

            <ul className="grid gap-2.5 text-interface">
                <li className="flex items-start gap-2.5">
                    <Timer
                        aria-hidden
                        className="mt-0.5 size-4 shrink-0 text-nimba-300"
                    />
                    <span>
                        {connue
                            ? `Durée : ${formaterDuree(connue.minutes)}${connue.origine === 'imprimee' ? ', comme sur le sujet' : ', celle de l’épreuve'}.`
                            : 'Le sujet n’indique pas sa durée : choisis la tienne.'}
                    </span>
                </li>
                <li className="flex items-start gap-2.5">
                    <Hourglass
                        aria-hidden
                        className="mt-0.5 size-4 shrink-0 text-nimba-300"
                    />
                    <span>
                        Le temps court même si tu fermes l’application ; à la
                        fin du temps, l’examen se termine seul.
                    </span>
                </li>
                <li className="flex items-start gap-2.5">
                    <CloudUpload
                        aria-hidden
                        className="mt-0.5 size-4 shrink-0 text-nimba-300"
                    />
                    <span>
                        Sans réseau aussi : chaque réponse est gardée sur le
                        téléphone, ta note part au retour du réseau.
                    </span>
                </li>
            </ul>

            {!connue && (
                <div
                    role="radiogroup"
                    aria-label="Durée de l’examen"
                    className="grid grid-cols-4 gap-2"
                >
                    {DUREES_AU_CHOIX.map((d) => (
                        <button
                            key={d}
                            type="button"
                            role="radio"
                            aria-checked={choisie === d}
                            onClick={() => setChoisie(d)}
                            className={cn(
                                'h-11 rounded-controle border text-interface font-semibold transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
                                choisie === d
                                    ? 'border-white bg-white text-ink-900'
                                    : 'border-white/25 text-white hover:bg-white/10',
                            )}
                        >
                            {formaterDuree(d)}
                        </button>
                    ))}
                </div>
            )}

            <Button
                className="w-full sm:w-fit"
                onClick={() => commencer(minutes, connue?.origine ?? 'choisie')}
            >
                Commencer l’examen · {formaterDuree(minutes)}
            </Button>
        </section>
    );
}

/** Le passage, plein écran : une question à la fois, chaque geste gardé. */
function Passage({
    sujet,
    initial,
    terminer,
}: {
    sujet: SujetEleve;
    initial: ExamenLocal;
    terminer: (examen: ExamenLocal) => void;
}) {
    const liste = useMemo(() => questionsDuSujet(sujet), [sujet]);
    const [examen, setExamen] = useState(initial);
    const [maintenant, setMaintenant] = useState(() => Date.now());
    const confirmer = useConfirmer();
    const fini = useRef(false);
    // Ce que voit l'élève, tout de suite (une frappe n'attend pas la base) ;
    // les écritures dans Dexie se suivent, dans l'ordre des gestes.
    const [reponses, setReponses] = useState(initial.reponses);
    const ecritures = useRef<Promise<unknown>>(Promise.resolve());
    const rang = Math.min(examen.question_courante, liste.length - 1);
    const courante = liste[rang];
    const restant = tempsRestantMs(examen, maintenant);
    const repondues = liste.filter(
        (q) => reponses[q.question.uuid]?.reponse,
    ).length;
    const style = MATIERES[sujet.matiere.cle];

    function ecrire(geste: () => Promise<ExamenLocal>) {
        ecritures.current = ecritures.current
            .then(geste)
            .then(setExamen)
            .catch(() => undefined);
    }

    const finir = useCallback(
        (e: ExamenLocal) => {
            if (!fini.current) {
                fini.current = true;
                // Fin seulement quand le dernier geste est écrit.
                void ecritures.current.then(() => terminer(e));
            }
        },
        [terminer],
    );

    // L'heure : à l'ouverture (rien n'est comparé : l'application a pu
    // rester fermée), puis toutes les 15 s et au retour sur l'écran.
    useEffect(() => {
        let repere = performance.now();

        ecrire(() => noterHeure(base, examen.id, Date.now(), null));

        const noterMaintenant = (comparer: boolean) => {
            const ecart = performance.now() - repere;
            const heure = Date.now();
            repere = performance.now();
            ecrire(() =>
                noterHeure(base, examen.id, heure, comparer ? ecart : null),
            );
        };

        const tic = window.setInterval(() => {
            setMaintenant(Date.now());
        }, 1000);
        const note = window.setInterval(
            () => noterMaintenant(true),
            RYTHME_HEURE_MS,
        );
        const visible = () => {
            if (document.visibilityState === 'visible') {
                noterMaintenant(false);
                setMaintenant(Date.now());
            }
        };
        document.addEventListener('visibilitychange', visible);

        return () => {
            window.clearInterval(tic);
            window.clearInterval(note);
            document.removeEventListener('visibilitychange', visible);
        };
    }, [examen.id]);

    // Fin du temps : l'examen se termine seul.
    useEffect(() => {
        if (restant <= 0) {
            finir(examen);
        }
    }, [restant, examen, finir]);

    if (!courante) {
        return null;
    }

    const donnee = reponses[courante.question.uuid];

    function aller(cible: number) {
        setExamen((e) => ({ ...e, question_courante: Math.max(0, cible) }));
        ecrire(() => allerA(base, examen.id, cible));
        window.scrollTo({ top: 0 });
    }

    async function terminerAvant() {
        const sans = liste.length - repondues;

        if (
            await confirmer({
                titre: 'Terminer l’examen ?',
                message:
                    sans > 0
                        ? `${pluriel(sans, 'question')} sans réponse. Après, tes réponses ne changent plus.`
                        : 'Après, tes réponses ne changent plus.',
                action: 'Terminer',
            })
        ) {
            finir(examen);
        }
    }

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={`Examen blanc · ${sujet.matiere.nom} ${sujet.libelle_session}`}
            className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-background"
        >
            <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur-md">
                <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-3">
                    <span
                        aria-hidden
                        className={cn(
                            'flex size-9 shrink-0 items-center justify-center rounded-[10px]',
                            style.tuile,
                        )}
                    >
                        <style.icone className="size-[18px]" />
                    </span>
                    <div className="grid min-w-0 flex-1 leading-tight">
                        <span className="truncate font-semibold">
                            {sujet.matiere.nom} · {sujet.libelle_session}
                        </span>
                        <span className="text-meta text-ink-600">
                            {repondues} / {liste.length} répondues
                        </span>
                    </div>
                    <p
                        aria-live="off"
                        aria-label={`Temps restant ${formaterRestant(restant)}`}
                        className={cn(
                            'flex items-center gap-1.5 rounded-controle bg-craie-100 px-2.5 py-1.5 text-interface font-semibold font-data dark:bg-white/[0.06]',
                            restant < 10 * 60_000 &&
                                'bg-indice-400/[0.16] text-indice-700 dark:bg-indice-400/15 dark:text-indice-400',
                        )}
                        data-capture="variable"
                    >
                        <Clock3 aria-hidden className="size-4" />
                        {formaterRestant(restant)}
                    </p>
                    <PastilleReseau className="max-sm:hidden" />
                </div>
                <ProgressionSegments
                    valeur={((rang + 1) / liste.length) * 100}
                    libelle={`Question ${rang + 1} sur ${liste.length}`}
                    className="mx-auto h-1 max-w-3xl px-4"
                />
            </header>

            <main className="mx-auto grid w-full max-w-3xl flex-1 content-start gap-5 px-4 pt-5 pb-32">
                <section className="grid gap-3 rounded-carte border bg-card p-4 shadow-carte sm:p-5">
                    <p className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="font-semibold">
                            {courante.partie.titre}
                        </span>
                        {courante.partie.bareme !== null && (
                            <span className="text-aide text-ink-500 font-data">
                                {pluriel(courante.partie.bareme, 'point')}
                            </span>
                        )}
                    </p>
                    {(courante.partie.consigne.content ?? []).length > 0 && (
                        <ContenuBlocs
                            doc={courante.partie.consigne}
                            className="text-interface"
                        />
                    )}
                </section>

                <section
                    aria-label={`Question ${courante.numero}`}
                    className="grid gap-5"
                >
                    <p className="text-aide font-semibold text-nimba-700 dark:text-nimba-300">
                        Question {courante.numero}
                    </p>
                    <ContenuBlocs doc={courante.question.enonce} />
                    <SaisieQuestion
                        key={courante.question.uuid}
                        question={courante.question}
                        reponse={donnee?.reponse ?? {}}
                        changer={(reponse) => {
                            const question = courante.question;
                            setReponses((r) => ({
                                ...r,
                                [question.uuid]: {
                                    version: question.version,
                                    reponse,
                                    criteres: null,
                                },
                            }));
                            ecrire(() =>
                                repondre(
                                    base,
                                    examen.id,
                                    question.uuid,
                                    question.version,
                                    reponse,
                                ),
                            );
                        }}
                        corrigee={false}
                    />
                    <p className="flex items-center gap-1.5 text-meta text-ink-500">
                        <EyeOff aria-hidden className="size-3.5" />
                        Pas d’indice pendant l’examen : le corrigé vient à la
                        fin.
                    </p>
                </section>

                <nav
                    aria-label="Questions de l’examen"
                    className="flex flex-wrap gap-1.5"
                >
                    {liste.map((q, i) => (
                        <button
                            key={q.question.uuid}
                            type="button"
                            aria-current={i === rang ? 'step' : undefined}
                            aria-label={`Question ${q.numero}${reponses[q.question.uuid]?.reponse ? ', répondue' : ''}`}
                            onClick={() => aller(i)}
                            className={cn(
                                'flex size-9 items-center justify-center rounded-[9px] border text-aide font-semibold font-data outline-none focus-visible:outline-2 focus-visible:outline-ring',
                                reponses[q.question.uuid]?.reponse
                                    ? 'border-ink-900 bg-ink-900 text-craie-50'
                                    : 'border-contour text-ink-600',
                                i === rang &&
                                    'ring-2 ring-nimba-500 ring-offset-2 ring-offset-background',
                            )}
                        >
                            {q.numero}
                        </button>
                    ))}
                </nav>
            </main>

            <footer className="fixed inset-x-0 bottom-0 z-10 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
                <div className="mx-auto flex w-full max-w-3xl items-center gap-2 px-4 py-3">
                    <Button
                        variant="outline"
                        taille="icone"
                        aria-label="Question précédente"
                        disabled={rang === 0}
                        onClick={() => aller(rang - 1)}
                    >
                        <ChevronLeft aria-hidden />
                    </Button>
                    <Button
                        variant="outline"
                        taille="icone"
                        aria-label="Question suivante"
                        disabled={rang >= liste.length - 1}
                        onClick={() => aller(rang + 1)}
                    >
                        <ChevronRight aria-hidden />
                    </Button>
                    <Button
                        className="ml-auto"
                        variant={rang >= liste.length - 1 ? 'default' : 'encre'}
                        onClick={() => void terminerAvant()}
                    >
                        <Flag aria-hidden />
                        Terminer l’examen
                    </Button>
                </div>
            </footer>
        </div>
    );
}

/** Après le temps : l'élève compare ses rédactions au corrigé et coche. */
function Evaluation({
    sujet,
    initial,
    valider,
}: {
    sujet: SujetEleve;
    initial: ExamenLocal;
    valider: (examen: ExamenLocal) => Promise<void>;
}) {
    const [examen, setExamen] = useState(initial);
    const [envoi, setEnvoi] = useState(false);
    const redactions = questionsDuSujet(sujet).filter(
        (q) =>
            q.question.type === 'ouverte' &&
            examen.reponses[q.question.uuid]?.reponse?.texte,
    );

    return (
        <section className="grid gap-5">
            <div className="grid gap-1.5 rounded-carte surface-encre p-5 text-white shadow-releve">
                <h2 className="text-titre-carte font-semibold">
                    {examen.temps_ecoule
                        ? 'Temps écoulé : tes réponses sont gardées'
                        : 'Examen terminé'}
                </h2>
                <p className="text-aide text-white/75">
                    Dernière étape : compare{' '}
                    {redactions.length > 1 ? 'tes rédactions' : 'ta rédaction'}{' '}
                    au corrigé et coche ce que tu as vraiment fait. Le reste se
                    corrige seul.
                </p>
            </div>

            {redactions.map(({ question, numero }) => {
                const donnee = examen.reponses[question.uuid];

                return (
                    <article
                        key={question.uuid}
                        className="grid gap-4 rounded-carte border bg-card p-4 shadow-carte sm:p-5"
                    >
                        <p className="text-aide font-semibold text-nimba-700 dark:text-nimba-300">
                            Question {numero}
                        </p>
                        <ContenuBlocs doc={question.enonce} />
                        <div className="grid gap-1 rounded-controle bg-craie-100 p-3 dark:bg-white/[0.04]">
                            <p className="text-meta font-semibold text-ink-600">
                                Ta rédaction
                            </p>
                            <p className="text-interface whitespace-pre-line">
                                {donnee?.reponse?.texte}
                            </p>
                        </div>
                        <CorrigePasAPas etapes={question.corrige} toutVoir />
                        <AutoEvaluation
                            bareme={question.donnees.bareme ?? []}
                            criteres={donnee?.criteres ?? []}
                            changer={(criteres) =>
                                void evaluer(
                                    base,
                                    examen.id,
                                    question.uuid,
                                    criteres,
                                ).then(setExamen)
                            }
                        />
                    </article>
                );
            })}

            <Button
                className="w-full sm:w-fit"
                disabled={envoi}
                onClick={() => {
                    setEnvoi(true);
                    void valider(examen).finally(() => setEnvoi(false));
                }}
            >
                {envoi ? <Spinner /> : <CircleCheck aria-hidden />}
                Voir ma note
            </Button>
        </section>
    );
}

/**
 * Le résultat, tout de suite (correction de l'appareil) ; « en attente
 * d'envoi » jusqu'à l'accusé du serveur, dont la note fait foi.
 */
function ResultatLocal({
    sujet,
    examen,
    note,
}: {
    sujet: SujetEleve;
    examen: ExamenLocal;
    note: Note;
}) {
    const { auth } = usePage().props;
    const { enAttente } = useHorsLigne();
    const [recu, setRecu] = useState(false);

    useEffect(() => {
        let actif = true;

        void base.acquittees.get(examen.id).then((a) => {
            if (actif) {
                setRecu(a !== undefined);
            }
        });

        return () => {
            actif = false;
        };
    }, [examen.id, enAttente]);

    return (
        <section className="grid gap-5">
            <div className="grid gap-4 rounded-carte surface-encre p-5 text-white shadow-releve sm:p-6">
                <p className="text-aide text-white/70">
                    {examen.temps_ecoule
                        ? 'Temps écoulé · examen terminé'
                        : 'Examen terminé'}
                </p>
                <p className="flex items-baseline gap-2">
                    <span className="text-[3.5rem] leading-none font-bold tracking-tight font-data">
                        {formaterNote(note.note)}
                    </span>
                    <span className="text-xl font-semibold text-nimba-300 font-data">
                        /20
                    </span>
                </p>
                <p
                    className={cn(
                        'flex items-center gap-1.5 text-aide',
                        recu ? 'text-juste-400' : 'text-white/75',
                    )}
                >
                    {recu ? (
                        <CircleCheck aria-hidden className="size-4" />
                    ) : (
                        <CloudUpload aria-hidden className="size-4" />
                    )}
                    {recu
                        ? 'Note reçue par N’karamögö.'
                        : 'En attente d’envoi : ta note part au retour du réseau, rien n’est perdu.'}
                </p>
                {examen.horloge_suspecte && (
                    <p className="flex items-start gap-1.5 text-aide text-soleil-300">
                        <TriangleAlert
                            aria-hidden
                            className="mt-0.5 size-4 shrink-0"
                        />
                        {examen.motif_horloge} La note est gardée ; elle est
                        signalée.
                    </p>
                )}
                <div className="flex flex-wrap gap-2">
                    {recu && (
                        <Button asChild>
                            <Link href={show(examen.id)}>
                                Voir le détail et le corrigé
                            </Link>
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white dark:bg-transparent"
                        onClick={() =>
                            void partagerCarte({
                                prenom: auth.user?.prenom ?? '',
                                matiere: sujet.matiere.nom,
                                session: sujet.libelle_session,
                                note: note.note,
                                exemple: sujet.est_exemple,
                            }).catch(() => undefined)
                        }
                    >
                        <Share2 aria-hidden />
                        Partager
                    </Button>
                </div>
            </div>

            <ul className="grid gap-2 rounded-carte border bg-card p-4 shadow-carte sm:p-5">
                {sujet.parties.map((partie, i) => (
                    <li
                        key={partie.uuid}
                        className="flex items-baseline justify-between gap-3 border-b pb-2 last:border-0 last:pb-0"
                    >
                        <span className="font-medium">{partie.titre}</span>
                        <span className="text-interface font-semibold font-data">
                            {formaterNote(note.parties[i]?.points ?? 0)}
                            <span className="font-medium text-ink-500">
                                {' '}
                                / {formaterNote(note.parties[i]?.sur ?? 0)}
                            </span>
                        </span>
                    </li>
                ))}
            </ul>

            <Link
                href={mesExamens()}
                className="text-aide font-medium text-nimba-700 underline-offset-2 hover:underline dark:text-nimba-300"
            >
                Tous mes examens blancs
            </Link>
        </section>
    );
}
