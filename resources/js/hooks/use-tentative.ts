import { useState } from 'react';
import {
    corriger,
    reponseComplete,
    reponseInitiale,
    scoreAutoEvaluation,
    verdictDe,
} from '@/lib/contenu/questions';
import type {
    QuestionEleve,
    ReponseQuestion,
    Verdict,
} from '@/lib/contenu/questions';

export type Reprise = {
    reponse: ReponseQuestion;
    score: number | null;
    auto_evaluee: boolean;
};

/**
 * Une tentative sur une question, côté appareil : la réponse en cours, les
 * indices vus, puis la correction **d'affichage** (le serveur recorrige,
 * HORS_LIGNE.md A.6) et, pour une question ouverte, l'auto-évaluation.
 * L'envoi par la file reste l'affaire de l'écran (séance, leçon) ; l'aperçu
 * du back-office n'envoie rien.
 */
export function useTentative(question: QuestionEleve, reprise?: Reprise) {
    const [reponse, setReponse] = useState<ReponseQuestion>(
        reprise?.reponse ?? reponseInitiale(question),
    );
    const [indicesVus, setIndicesVus] = useState(0);
    const [verifiee, setVerifiee] = useState(reprise !== undefined);
    const [score, setScore] = useState<number | null>(reprise?.score ?? null);
    const [criteres, setCriteres] = useState<string[]>([]);
    const [evaluee, setEvaluee] = useState(reprise?.auto_evaluee ?? false);

    const ouverte = question.type === 'ouverte';
    const verdict: Verdict | null = !verifiee
        ? null
        : ouverte && !evaluee
          ? 'a_evaluer'
          : verdictDe(score);

    return {
        reponse,
        changer: setReponse,
        complete: reponseComplete(question, reponse),
        indicesVus,
        voirIndice: () =>
            setIndicesVus((v) => Math.min(v + 1, question.indices.length)),
        verifiee,
        score,
        verdict,
        criteres,
        setCriteres,
        evaluee,
        /** Fige la réponse et la corrige sur l'appareil. */
        verifier(): number | null {
            const resultat = corriger(
                question.type,
                question.attendue,
                reponse as Record<string, unknown>,
            );

            setScore(resultat);
            setVerifiee(true);

            return resultat;
        },
        /** Question ouverte : valide les critères cochés. */
        valider(): number {
            const resultat = scoreAutoEvaluation(question.donnees, criteres);

            setScore(resultat);
            setEvaluee(true);

            return resultat;
        },
        /** Terminée : corrigée, et auto-évaluée si elle est ouverte. */
        terminee: verifiee && (!ouverte || evaluee),
    };
}

export type Tentative = ReturnType<typeof useTentative>;
