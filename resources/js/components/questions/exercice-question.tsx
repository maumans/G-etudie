import { CircleHelp } from 'lucide-react';
import { useRef } from 'react';
import { ContenuBlocs } from '@/components/contenu/contenu-blocs';
import { Button } from '@/components/ui/button';
import { useTentative } from '@/hooks/use-tentative';
import type { QuestionEleve } from '@/lib/contenu/questions';
import { enregistrer } from '@/lib/hors-ligne';
import { cn } from '@/lib/utils';
import {
    AutoEvaluation,
    CorrigePasAPas,
    IndicesQuestion,
} from './aides-question';
import { VerdictQuestion } from './commun';
import { SaisieQuestion } from './saisie-question';

/**
 * Une question jouée sur place, hors de l'ardoise plein écran : la
 * mini-question d'une leçon (PLAN M4) et l'aperçu du back-office « comme
 * l'élève la verra ». Même saisie, mêmes indices, même verdict, même
 * corrigé que la séance.
 *
 * `envoyer` : la réponse part par la file (`tentative.enregistrer`, mode
 * entraînement), comme tout geste élève. Sans lui (aperçu), rien ne part.
 */
export function ExerciceQuestion({
    question,
    envoyer = false,
    titre = 'Vérifie que tu as compris',
    className,
}: {
    question: QuestionEleve;
    envoyer?: boolean;
    titre?: string;
    className?: string;
}) {
    const tentative = useTentative(question);
    const debut = useRef(Date.now());
    const uuid = useRef<Promise<string> | null>(null);

    function verifier() {
        tentative.verifier();

        if (envoyer) {
            uuid.current = enregistrer({
                type: 'tentative.enregistrer',
                charge: {
                    question: question.uuid,
                    version: question.version,
                    reponse: tentative.reponse,
                    seance: null,
                    duree_secondes: Math.min(
                        65535,
                        Math.round((Date.now() - debut.current) / 1000),
                    ),
                    indices_utilises: tentative.indicesVus,
                },
                priorite: 1,
            });
            uuid.current.catch(() => undefined);
        }
    }

    function valider() {
        tentative.valider();

        if (envoyer && uuid.current) {
            const criteres = tentative.criteres;

            void uuid.current
                .then((tentativeUuid) =>
                    enregistrer({
                        type: 'tentative.auto_evaluer',
                        charge: { tentative: tentativeUuid, criteres },
                        priorite: 1,
                        depend_de: tentativeUuid,
                    }),
                )
                .catch(() => undefined);
        }
    }

    return (
        <section
            aria-label={titre}
            className={cn(
                'grid gap-5 rounded-carte border bg-card p-4 shadow-carte sm:p-5',
                className,
            )}
        >
            <p className="flex items-center gap-2 text-aide font-semibold text-nimba-700 dark:text-nimba-300">
                <CircleHelp aria-hidden className="size-4" />
                {titre}
            </p>
            <ContenuBlocs doc={question.enonce} />
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

            <div aria-live="polite" className="grid gap-4 empty:hidden">
                {tentative.verdict && (
                    <VerdictQuestion
                        verdict={tentative.verdict}
                        score={tentative.score}
                    />
                )}
                {tentative.verifiee && (
                    <CorrigePasAPas
                        etapes={question.corrige}
                        className="border-t pt-4"
                    />
                )}
                {tentative.verifiee && question.type === 'ouverte' && (
                    <AutoEvaluation
                        bareme={question.donnees.bareme ?? []}
                        criteres={tentative.criteres}
                        changer={tentative.setCriteres}
                        fige={tentative.evaluee}
                    />
                )}
            </div>

            {!tentative.verifiee ? (
                <Button
                    className="w-full sm:w-fit"
                    disabled={!tentative.complete}
                    onClick={verifier}
                >
                    Vérifier
                </Button>
            ) : (
                question.type === 'ouverte' &&
                !tentative.evaluee && (
                    <Button className="w-full sm:w-fit" onClick={valider}>
                        Valider mon auto-évaluation
                    </Button>
                )
            )}
        </section>
    );
}
