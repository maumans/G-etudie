import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    BookOpenText,
    ChevronLeft,
    ChevronRight,
    Clock3,
    FileText,
    Hash,
    ListChecks,
    Scale,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ContenuBlocs } from '@/components/contenu/contenu-blocs';
import { CorrigePasAPas } from '@/components/questions/aides-question';
import { ExerciceQuestion } from '@/components/questions/exercice-question';
import { SaisieQuestion } from '@/components/questions/saisie-question';
import { SignalerErreur } from '@/components/signaler-erreur';
import { Badge } from '@/components/ui/badge';
import { BandeauExemple } from '@/components/ui/bandeau-exemple';
import { Button } from '@/components/ui/button';
import { ouvrirEcranIndisponible, useHorsLigne } from '@/lib/hors-ligne';
import type { QuestionEleve, ReponseQuestion } from '@/lib/contenu/questions';
import { verdictDe } from '@/lib/contenu/questions';
import type { PartieSujet, SujetEleve } from '@/lib/contenu/sujets';
import {
    formaterDuree,
    formaterPoids,
    questionsDuSujet,
} from '@/lib/contenu/sujets';
import { MATIERES } from '@/lib/matieres';
import { cn, pluriel } from '@/lib/utils';
import { index } from '@/routes/eleve/annales';

type Mode = 'lecture' | 'entrainement';

type Props = {
    sujet: SujetEleve;
    mode: Mode;
    /** Question où reprendre l'entraînement (lien depuis « Exercices par chapitre »). */
    question: string | null;
    /** Dernier score de l'élève par question (uuid → 0-100, null : à auto-évaluer). */
    scores: Record<string, number | null>;
};

/**
 * Une annale (PLAN M6), en deux modes :
 *  - **Lecture** : l'énoncé partie par partie, et sous chaque question son
 *    corrigé, dévoilé à la demande ;
 *  - **Entraînement** : question par question, avec indices, réponse par
 *    la file d'opérations (`tentative.enregistrer`, mode entraînement).
 * Le document original reste consultable à côté : c'est la preuve que la
 * version structurée est fidèle. Reçoit un **objet de contenu** (`sujet`),
 * comme la leçon : un pack (lot 7) le fournira tel quel.
 */
export default function Annale({ sujet, mode, question, scores }: Props) {
    const [vue, setVue] = useState<Mode>(mode);
    const style = MATIERES[sujet.matiere.cle];
    const liste = useMemo(() => questionsDuSujet(sujet), [sujet]);
    const faites = liste.filter(
        (q) => scores[q.question.uuid] !== undefined,
    ).length;
    const duree = formaterDuree(sujet.duree_minutes);
    const total = sujet.parties.reduce((t, p) => t + (p.bareme ?? 0), 0);

    // L'adresse suit le mode (un rechargement, une copie hors ligne gardent la vue).
    useEffect(() => {
        const adresse = new URL(window.location.href);
        adresse.searchParams.set('mode', vue);
        window.history.replaceState(window.history.state, '', adresse);
    }, [vue]);

    return (
        <>
            <Head title={`${sujet.matiere.nom} · ${sujet.libelle_session}`} />
            <div className="grid grid-cols-1 gap-6">
                <div className="grid gap-4">
                    <Button
                        asChild
                        variant="ghost"
                        taille="compacte"
                        className="-ml-2 w-fit"
                    >
                        <Link href={index()} prefetch>
                            <ArrowLeft aria-hidden />
                            Les annales
                        </Link>
                    </Button>
                    <header className="flex min-w-0 items-start gap-3.5">
                        <span
                            aria-hidden
                            className={cn(
                                'flex size-12 shrink-0 items-center justify-center rounded-[14px]',
                                style.tuile,
                            )}
                        >
                            <style.icone className="size-[22px]" />
                        </span>
                        <div className="grid min-w-0 gap-1.5">
                            <h1 className="text-[1.625rem] leading-tight titre-contraste lg:text-titre-ecran-large">
                                {sujet.matiere.nom} ·{' '}
                                <strong>{sujet.libelle_session}</strong>
                            </h1>
                            <p className="text-ink-600">{sujet.titre}</p>
                            <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-aide text-ink-500">
                                {sujet.origine === 'blanc_maison' && (
                                    <li>
                                        <Badge variant="neutre">
                                            Sujet maison
                                        </Badge>
                                    </li>
                                )}
                                <li className="flex items-center gap-1.5">
                                    <Hash aria-hidden className="size-3.5" />
                                    {pluriel(liste.length, 'question')}
                                </li>
                                {duree && (
                                    <li className="flex items-center gap-1.5">
                                        <Clock3
                                            aria-hidden
                                            className="size-3.5"
                                        />
                                        Durée {duree}
                                    </li>
                                )}
                                {sujet.coefficient && (
                                    <li className="flex items-center gap-1.5">
                                        <Scale
                                            aria-hidden
                                            className="size-3.5"
                                        />
                                        Coefficient {sujet.coefficient}
                                    </li>
                                )}
                            </ul>
                        </div>
                    </header>
                </div>

                {sujet.est_exemple && <BandeauExemple />}

                <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
                    <div className="grid min-w-0 gap-5">
                        <ChoixMode vue={vue} changer={setVue} />

                        {liste.length === 0 ? (
                            <p className="rounded-carte border bg-card p-5 text-ink-600 shadow-carte">
                                Les questions de ce sujet sont en cours de
                                relecture. Reviens bientôt.
                            </p>
                        ) : vue === 'lecture' ? (
                            <Lecture sujet={sujet} />
                        ) : (
                            <Entrainement
                                sujet={sujet}
                                depart={question}
                                scores={scores}
                            />
                        )}

                        {/* En entraînement, chaque question a le sien. */}
                        {vue === 'lecture' && (
                            <SignalerErreur
                                cible="sujet"
                                uuid={sujet.uuid}
                                version={sujet.version}
                            />
                        )}
                    </div>

                    <aside className="grid content-start gap-4">
                        <section
                            aria-labelledby="titre-avancement"
                            className="grid gap-3 rounded-carte border bg-card p-5 shadow-carte"
                        >
                            <h2
                                id="titre-avancement"
                                className="text-titre-carte font-semibold"
                            >
                                Ton avancement
                            </h2>
                            <p className="flex items-baseline gap-1.5">
                                <span className="text-[1.75rem] leading-none font-bold font-data">
                                    {faites}
                                </span>
                                <span className="font-semibold text-ink-500 font-data">
                                    / {liste.length}
                                </span>
                                <span className="text-aide text-ink-600">
                                    questions faites
                                </span>
                            </p>
                            <ol
                                aria-label="Questions du sujet"
                                className="flex flex-wrap gap-1.5"
                            >
                                {liste.map(({ question: q, numero }) => (
                                    <li key={q.uuid}>
                                        <PastilleQuestion
                                            numero={numero}
                                            score={scores[q.uuid]}
                                        />
                                    </li>
                                ))}
                            </ol>
                            {total > 0 && (
                                <p className="text-meta text-ink-500">
                                    Barème imprimé : {pluriel(total, 'point')}.
                                </p>
                            )}
                        </section>

                        {sujet.document && <DocumentOriginal sujet={sujet} />}
                    </aside>
                </div>
            </div>
        </>
    );
}

function ChoixMode({
    vue,
    changer,
}: {
    vue: Mode;
    changer: (mode: Mode) => void;
}) {
    const modes = [
        {
            cle: 'lecture' as const,
            libelle: 'Lecture',
            aide: 'L’énoncé et le corrigé',
            icone: BookOpenText,
        },
        {
            cle: 'entrainement' as const,
            libelle: 'Entraînement',
            aide: 'Question par question',
            icone: ListChecks,
        },
    ];

    return (
        <div
            role="tablist"
            aria-label="Mode"
            className="grid grid-cols-2 gap-1 rounded-controle bg-craie-100 p-1 sm:w-fit"
        >
            {modes.map((m) => (
                <button
                    key={m.cle}
                    type="button"
                    role="tab"
                    aria-selected={vue === m.cle}
                    onClick={() => changer(m.cle)}
                    className={cn(
                        'flex items-center gap-2.5 rounded-[7px] px-3 py-2 text-left outline-none focus-visible:outline-2 focus-visible:outline-ring sm:pr-5',
                        vue === m.cle
                            ? 'bg-relief text-ink-900 shadow-xs ring-1 ring-black/5 dark:ring-white/5'
                            : 'text-ink-600 hover:text-ink-900',
                    )}
                >
                    <m.icone aria-hidden className="size-4 shrink-0" />
                    <span className="grid leading-tight">
                        <span className="font-semibold">{m.libelle}</span>
                        <span className="text-meta text-ink-600 max-sm:hidden">
                            {m.aide}
                        </span>
                    </span>
                </button>
            ))}
        </div>
    );
}

function EntetePartie({ partie }: { partie: PartieSujet }) {
    return (
        <div className="grid gap-3">
            <h2 className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="text-titre-carte font-semibold">
                    {partie.titre}
                </span>
                {partie.bareme !== null && (
                    <span className="text-aide text-ink-500 font-data">
                        {pluriel(partie.bareme, 'point')}
                    </span>
                )}
            </h2>
            {(partie.consigne.content ?? []).length > 0 && (
                <ContenuBlocs doc={partie.consigne} />
            )}
        </div>
    );
}

/** Lecture : tout le sujet, et le corrigé de chaque question à la demande. */
function Lecture({ sujet }: { sujet: SujetEleve }) {
    let numero = 0;

    return (
        <div className="grid gap-5">
            {sujet.parties
                .filter((p) => p.questions.length > 0)
                .map((partie) => (
                    <article
                        key={partie.uuid}
                        className="grid gap-5 rounded-carte border bg-card p-5 shadow-carte sm:p-6"
                    >
                        <EntetePartie partie={partie} />
                        <ol className="grid gap-5">
                            {partie.questions.map((q) => {
                                numero += 1;

                                return (
                                    <QuestionLue
                                        key={q.uuid}
                                        question={q}
                                        numero={numero}
                                    />
                                );
                            })}
                        </ol>
                    </article>
                ))}
        </div>
    );
}

/** La bonne réponse, écrite comme si l'élève l'avait donnée (lecture). */
function reponseAttendue(question: QuestionEleve): ReponseQuestion | null {
    const a = question.attendue;

    switch (question.type) {
        case 'qcm_une':
            return { option: a.option as string };
        case 'qcm_plusieurs':
            return { options: (a.options as string[]) ?? [] };
        case 'vrai_faux':
            return { valeur: a.valeur as boolean };
        default:
            return null;
    }
}

function QuestionLue({
    question,
    numero,
}: {
    question: QuestionEleve;
    numero: number;
}) {
    const [corrige, setCorrige] = useState(false);
    const avecChoix = ['qcm_une', 'qcm_plusieurs', 'vrai_faux'].includes(
        question.type,
    );
    const attendue = reponseAttendue(question);

    return (
        <li className="grid gap-3 border-t pt-5 first:border-t-0 first:pt-0">
            <div className="flex gap-3">
                <span
                    aria-hidden
                    className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ink-900 text-meta font-semibold text-craie-50 font-data"
                >
                    {numero}
                </span>
                <div className="grid min-w-0 flex-1 gap-3">
                    <h3 className="sr-only">Question {numero}</h3>
                    <ContenuBlocs doc={question.enonce} />
                    {avecChoix && (
                        <SaisieQuestion
                            question={question}
                            reponse={corrige && attendue ? attendue : {}}
                            changer={() => undefined}
                            corrigee={corrige}
                            libelle={`Choix de la question ${numero}`}
                        />
                    )}
                    {corrige ? (
                        <CorrigePasAPas
                            etapes={question.corrige}
                            toutVoir
                            className="rounded-carte bg-craie-100/70 p-4 dark:bg-white/[0.03]"
                        />
                    ) : (
                        <Button
                            variant="doux"
                            taille="compacte"
                            className="w-fit"
                            onClick={() => setCorrige(true)}
                        >
                            Voir le corrigé
                        </Button>
                    )}
                </div>
            </div>
        </li>
    );
}

/** Entraînement : une question à la fois, dans l'ordre du sujet. */
function Entrainement({
    sujet,
    depart,
    scores,
}: {
    sujet: SujetEleve;
    depart: string | null;
    scores: Record<string, number | null>;
}) {
    const liste = useMemo(() => questionsDuSujet(sujet), [sujet]);
    const premiere = Math.max(
        0,
        depart
            ? liste.findIndex((q) => q.question.uuid === depart)
            : liste.findIndex((q) => scores[q.question.uuid] === undefined),
    );
    const [rang, setRang] = useState(premiere);
    const courante = liste[rang];

    if (!courante) {
        return null;
    }

    return (
        <div className="grid gap-4">
            <div className="flex items-center justify-between gap-3">
                <p className="text-aide font-medium text-ink-600">
                    Question{' '}
                    <span className="font-semibold text-ink-900 font-data">
                        {courante.numero}
                    </span>{' '}
                    sur {liste.length}
                </p>
                <div className="flex gap-1.5">
                    <Button
                        variant="outline"
                        taille="icone"
                        aria-label="Question précédente"
                        disabled={rang === 0}
                        onClick={() => setRang(rang - 1)}
                    >
                        <ChevronLeft aria-hidden />
                    </Button>
                    <Button
                        variant="outline"
                        taille="icone"
                        aria-label="Question suivante"
                        disabled={rang >= liste.length - 1}
                        onClick={() => setRang(rang + 1)}
                    >
                        <ChevronRight aria-hidden />
                    </Button>
                </div>
            </div>

            <section className="grid gap-4 rounded-carte border bg-card p-5 shadow-carte">
                <EntetePartie partie={courante.partie} />
            </section>

            <ExerciceQuestion
                key={courante.question.uuid}
                question={courante.question}
                envoyer
                titre={`Question ${courante.numero}`}
            />

            <div className="flex flex-wrap items-center justify-end gap-3">
                {rang < liste.length - 1 && (
                    <Button
                        variant="outline"
                        onClick={() => {
                            setRang(rang + 1);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                    >
                        Question suivante
                        <ChevronRight aria-hidden />
                    </Button>
                )}
            </div>
        </div>
    );
}

function PastilleQuestion({
    numero,
    score,
}: {
    numero: number;
    score: number | null | undefined;
}) {
    const verdict = score === undefined ? null : verdictDe(score);
    const libelle =
        verdict === null
            ? 'pas encore faite'
            : {
                  juste: 'juste',
                  partiel: 'en partie juste',
                  faux: 'pas encore juste',
                  a_evaluer: 'à auto-évaluer',
              }[verdict];

    return (
        <span
            title={`Question ${numero} : ${libelle}`}
            aria-label={`Question ${numero} : ${libelle}`}
            className={cn(
                'flex size-8 items-center justify-center rounded-[9px] border text-aide font-semibold font-data',
                verdict === null && 'border-contour text-ink-500',
                verdict === 'juste' &&
                    'border-juste-600/40 bg-juste-600/[0.12] text-juste-700 dark:border-juste-400/40 dark:bg-juste-400/15 dark:text-juste-400',
                verdict === 'partiel' &&
                    'border-indice-400/45 bg-indice-400/[0.14] text-indice-700 dark:text-indice-400',
                verdict === 'faux' &&
                    'border-faux-600/40 bg-faux-600/[0.10] text-faux-600 dark:border-faux-400/40 dark:bg-faux-400/15 dark:text-faux-400',
                verdict === 'a_evaluer' && 'border-ink-400/50 text-ink-600',
            )}
        >
            {numero}
        </span>
    );
}

/** Le document original : ouvert à la demande, poids annoncé, en ligne seulement. */
function DocumentOriginal({ sujet }: { sujet: SujetEleve }) {
    const { reseau } = useHorsLigne();
    const document = sujet.document;

    if (!document) {
        return null;
    }

    const genre = document.type === 'application/pdf' ? 'PDF' : 'Photo';
    const poids = formaterPoids(document.octets);

    return (
        <section
            aria-labelledby="titre-document"
            className="grid gap-3 rounded-carte border bg-card p-5 shadow-carte"
        >
            <div className="flex items-start gap-3">
                <span
                    aria-hidden
                    className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-craie-100 text-ink-600 dark:bg-white/[0.05]"
                >
                    <FileText className="size-5" />
                </span>
                <div className="grid gap-0.5">
                    <h2
                        id="titre-document"
                        className="text-titre-carte font-semibold"
                    >
                        Le sujet original
                    </h2>
                    <p className="text-aide text-ink-500">
                        Tel qu’il a été distribué le jour de l’examen. {genre}
                        {poids && ` · ${poids}`}
                    </p>
                </div>
            </div>
            {reseau === 'en_ligne' ? (
                <Button asChild variant="outline" taille="compacte">
                    <a href={document.url} target="_blank" rel="noopener">
                        Ouvrir le document
                    </a>
                </Button>
            ) : (
                <Button
                    variant="outline"
                    taille="compacte"
                    onClick={() => ouvrirEcranIndisponible('connexion_requise')}
                >
                    Ouvrir le document
                </Button>
            )}
        </section>
    );
}
