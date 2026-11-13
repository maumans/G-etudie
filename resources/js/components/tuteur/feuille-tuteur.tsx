import { Link, usePage } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import type { QuestionAncree } from '@/components/tuteur/bouton-tuteur';
import { FilTuteur } from '@/components/tuteur/fil-tuteur';
import { Feuille, FeuilleContenu } from '@/components/ui/feuille';
import { useTuteur } from '@/hooks/use-tuteur';
import { show as voirConversation } from '@/routes/eleve/tuteur';

/**
 * La feuille du tuteur ouverte depuis une question (chargée à la demande
 * par BoutonTuteur). Son montage lance l'explication ; la refermer ne
 * coupe rien : la réponse finit de s'écrire et se garde.
 */
export default function FeuilleTuteur({
    ouvert,
    changer,
    question,
    reponse,
    etape,
}: {
    ouvert: boolean;
    changer: (ouvert: boolean) => void;
    question: QuestionAncree;
    reponse: Record<string, unknown> | null;
    etape?: number;
}) {
    const { tuteur: quota } = usePage().props;
    const etat = useTuteur({ quotaInitial: quota?.restants ?? null });
    const lancee = useRef(false);
    const surEtape = etape !== undefined;
    const { demander } = etat;

    useEffect(() => {
        if (lancee.current) {
            return;
        }

        lancee.current = true;
        void demander({
            demande: surEtape ? 'etape' : 'expliquer',
            question: question.uuid,
            version: question.version,
            reponse,
            ...(surEtape ? { etape } : {}),
        });
    }, [demander, etape, question, reponse, surEtape]);

    return (
        <Feuille open={ouvert} onOpenChange={changer}>
            <FeuilleContenu
                titre={
                    surEtape
                        ? `Ton tuteur t’explique l’étape ${etape + 1}`
                        : 'Ton tuteur t’explique'
                }
                description="Il part du corrigé de tes enseignants et le redit plus simplement."
                className="md:max-w-xl"
                pied={
                    etat.conversation ? (
                        <Link
                            href={voirConversation(etat.conversation)}
                            className="text-aide font-medium text-nimba-700 underline-offset-4 hover:underline dark:text-nimba-300"
                        >
                            Retrouver cette conversation dans « Mon tuteur »
                        </Link>
                    ) : undefined
                }
            >
                <FilTuteur tuteur={etat} abonne={quota?.abonne ?? false} />
            </FeuilleContenu>
        </Feuille>
    );
}
