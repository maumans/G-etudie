import { HelpCircle, Sparkles } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import { Button } from '@/components/ui/button';
import { usePeut } from '@/hooks/use-peut';
import { horsLigneSur, ouvrirEcranIndisponible } from '@/lib/hors-ligne';
import { cn } from '@/lib/utils';

// Le panneau (fil, flux, formules) ne se charge qu'au premier appui : la
// question d'essai de la vitrine et les pages qui ne l'ouvrent jamais ne
// paient pas son poids (budgets, HORS_LIGNE.md A.11).
const FeuilleTuteur = lazy(() => import('@/components/tuteur/feuille-tuteur'));

export type QuestionAncree = { uuid: string; version: number };

/**
 * « Explique-moi » sous une question, ou « Je ne comprends pas cette étape »
 * sur une étape du corrigé (lot 10, PLAN M11). Ouvre une feuille où le
 * tuteur écrit son explication en flux, à partir de la question, de la
 * réponse de l'élève et du corrigé validé.
 *
 * En ligne seulement (HORS_LIGNE.md A.2) : hors ligne, le dialogue « Cet
 * écran demande une connexion » s'ouvre et l'élève reste où il est. Muet
 * pour un compte sans `tuteur.utiliser` (visiteur, aperçu du back-office).
 */
export function BoutonTuteur({
    question,
    reponse = null,
    etape,
    className,
}: {
    question: QuestionAncree;
    reponse?: Record<string, unknown> | null;
    /** Rang de l'étape du corrigé (à partir de 0). */
    etape?: number;
    className?: string;
}) {
    const peut = usePeut();
    const [ouvert, setOuvert] = useState(false);
    // Une fois ouverte, la feuille reste montée : la rouvrir retrouve la
    // conversation déjà écrite.
    const [montee, setMontee] = useState(false);
    const surEtape = etape !== undefined;

    if (!peut('tuteur.utiliser')) {
        return null;
    }

    function ouvrir() {
        if (horsLigneSur()) {
            ouvrirEcranIndisponible('connexion_requise');

            return;
        }

        setMontee(true);
        setOuvert(true);
    }

    return (
        <>
            {surEtape ? (
                <Button
                    variant="ghost"
                    taille="petite"
                    onClick={ouvrir}
                    aria-haspopup="dialog"
                    className={cn(
                        '-ml-3 h-auto min-h-8 w-fit py-1.5 text-left whitespace-normal text-nimba-700 hover:bg-nimba-500/[0.1] dark:text-nimba-300',
                        className,
                    )}
                >
                    <HelpCircle aria-hidden />
                    Je ne comprends pas cette étape
                </Button>
            ) : (
                <Button
                    variant="doux"
                    taille="compacte"
                    onClick={ouvrir}
                    aria-haspopup="dialog"
                    className={cn('w-fit', className)}
                >
                    <Sparkles aria-hidden />
                    Explique-moi
                </Button>
            )}
            {montee && (
                <Suspense fallback={null}>
                    <FeuilleTuteur
                        ouvert={ouvert}
                        changer={setOuvert}
                        question={question}
                        reponse={reponse}
                        etape={etape}
                    />
                </Suspense>
            )}
        </>
    );
}
