import { Link } from '@inertiajs/react';
import {
    ChevronRight,
    CircleCheck,
    CircleX,
    Play,
    Sparkles,
} from 'lucide-react';
import { Suspense, lazy, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { QuestionEleve } from '@/lib/contenu/questions';
import { base } from '@/lib/hors-ligne';
import { MATIERES } from '@/lib/matieres';
import { jourLocal, questionDuJourLocale } from '@/lib/progression/locale';
import { cn } from '@/lib/utils';
import { culture as pageCulture } from '@/routes/eleve';

/**
 * L'ardoise de saisie (et le lecteur de formules) : chargée au premier
 * appui sur l'accueil, pour que la coquille de l'espace élève reste légère
 * (HORS_LIGNE.md A.11 ; le service worker garde le fragment hors ligne).
 */
const ExerciceQuestion = lazy(() =>
    import('@/components/questions/exercice-question').then((m) => ({
        default: m.ExerciceQuestion,
    })),
);

export type JourCulture = {
    date: string;
    question: QuestionEleve;
    repondue: boolean;
    score: number | null;
};

/**
 * La question du jour de culture générale (lot 12, PLAN M10) : la même pour
 * tous les élèves ce jour-là, jouée sur place ; la réponse part par la file
 * (`tentative.enregistrer`). Hors ligne, l'écran peut être une copie d'hier :
 * l'appareil prend alors la question de **son** jour, rangée par
 * l'instantané (HL4).
 */
export function useQuestionDuJour(
    jour: JourCulture | null,
): JourCulture | null {
    const [actuelle, setActuelle] = useState(jour);

    useEffect(() => {
        const aujourdhui = jourLocal(new Date());

        if (jour?.date === aujourdhui) {
            setActuelle(jour);

            return;
        }

        let annule = false;

        void questionDuJourLocale(base, aujourdhui).then((question) => {
            if (!annule && question) {
                setActuelle({
                    date: aujourdhui,
                    question: question as QuestionEleve,
                    repondue: false,
                    score: null,
                });
            }
        });

        return () => {
            annule = true;
        };
    }, [jour]);

    return actuelle;
}

export function QuestionDuJour({
    jour,
    lienCulture = false,
    jouerTout = false,
    className,
}: {
    jour: JourCulture | null;
    /** « Culture générale » : la question se joue tout de suite ; l'accueil montre l'énoncé et « Répondre ». */
    jouerTout?: boolean;
    /** Accueil : un lien vers « Culture générale ». */
    lienCulture?: boolean;
    className?: string;
}) {
    const actuelle = useQuestionDuJour(jour);
    const [ouverte, setOuverte] = useState(jouerTout);
    const style = MATIERES.culture;

    return (
        <section
            aria-labelledby="titre-question-du-jour"
            className={cn(
                'grid gap-4 rounded-carte border bg-card p-5 shadow-carte',
                className,
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    <span
                        aria-hidden
                        className={cn(
                            'flex size-10 shrink-0 items-center justify-center rounded-[12px]',
                            style.tuile,
                        )}
                    >
                        <style.icone className="size-5" />
                    </span>
                    <div className="grid min-w-0">
                        <h2
                            id="titre-question-du-jour"
                            className="text-[0.9375rem]"
                        >
                            La question du jour
                        </h2>
                        <p className="truncate text-aide text-ink-500">
                            Culture générale
                            {actuelle && ` · ${actuelle.question.notion}`} · la
                            même pour tous
                        </p>
                    </div>
                </div>
                {lienCulture && (
                    <Link
                        href={pageCulture()}
                        prefetch
                        className="flex shrink-0 items-center gap-0.5 rounded-controle text-aide font-medium text-nimba-700 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-ring dark:text-nimba-300"
                    >
                        Quiz
                        <ChevronRight aria-hidden className="size-4" />
                    </Link>
                )}
            </div>

            {actuelle === null ? (
                <p className="flex items-center gap-3 rounded-controle bg-craie-100 p-4 text-aide text-ink-600 dark:bg-relief/60">
                    <Sparkles
                        aria-hidden
                        className="size-5 shrink-0 text-ink-500"
                    />
                    Les questions de culture générale arrivent : l’équipe les
                    rédige et vérifie leurs sources.
                </p>
            ) : actuelle.repondue ? (
                <DejaRepondue jour={actuelle} />
            ) : ouverte ? (
                <Suspense
                    fallback={
                        <p className="rounded-controle bg-craie-50 p-4 font-medium text-ink-900 dark:bg-relief/40">
                            {texteDe(actuelle.question.enonce)}
                        </p>
                    }
                >
                    <ExerciceQuestion
                        key={actuelle.date}
                        question={actuelle.question}
                        envoyer
                        titre="Ta réponse"
                        className="border-0 bg-craie-50 p-4 shadow-none sm:p-4 dark:bg-relief/40"
                    />
                </Suspense>
            ) : (
                <div className="grid gap-3 rounded-controle bg-craie-50 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center dark:bg-relief/40">
                    <p className="font-medium text-ink-900">
                        {texteDe(actuelle.question.enonce)}
                    </p>
                    <Button
                        variant="doux"
                        className="w-full sm:w-fit"
                        onClick={() => setOuverte(true)}
                    >
                        <Play aria-hidden className="fill-current" />
                        Répondre
                    </Button>
                </div>
            )}
        </section>
    );
}

function DejaRepondue({ jour }: { jour: JourCulture }) {
    const juste = jour.score === 100;

    return (
        <div className="grid gap-3">
            <p className="font-medium text-ink-900">
                {jour.question.enonce.content?.[0]
                    ? texteDe(jour.question.enonce)
                    : ''}
            </p>
            <p
                className={cn(
                    'flex items-center gap-2 text-aide font-semibold',
                    juste
                        ? 'text-juste-700 dark:text-juste-400'
                        : 'text-faux-700 dark:text-faux-400',
                )}
            >
                {juste ? (
                    <CircleCheck aria-hidden className="size-4" />
                ) : (
                    <CircleX aria-hidden className="size-4" />
                )}
                {juste
                    ? 'Bonne réponse ! Reviens demain pour la suivante.'
                    : 'Pas cette fois. Reviens demain pour la suivante.'}
            </p>
        </div>
    );
}

/** Le texte brut d'un énoncé (premier paragraphe), pour un rappel court. */
function texteDe(doc: QuestionEleve['enonce']): string {
    const lire = (noeud: unknown): string => {
        if (!noeud || typeof noeud !== 'object') {
            return '';
        }

        const n = noeud as { text?: string; content?: unknown[] };

        return (n.text ?? '') + (n.content ?? []).map(lire).join('');
    };

    return lire(doc.content?.[0]);
}
