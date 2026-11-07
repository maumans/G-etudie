import { ExerciceQuestion } from '@/components/questions/exercice-question';
import type { QuestionEleve } from '@/lib/contenu/questions';

/**
 * La question jouable de la vitrine (lot 8, PLAN M1). Chargée **à la
 * demande**, quand le visiteur approche de la section : elle apporte le
 * moteur de questions et KaTeX, que l'accueil n'a pas à payer au premier
 * affichage (critère Lighthouse).
 *
 * `envoyer` reste faux : un visiteur n'est pas un élève, rien ne part dans
 * la file d'opérations, la correction est celle de l'appareil (affichage).
 */
export default function QuestionDemo({
    question,
}: {
    question: QuestionEleve;
}) {
    return (
        <ExerciceQuestion
            question={question}
            titre="À vous de jouer"
            className="shadow-flottant"
        />
    );
}
