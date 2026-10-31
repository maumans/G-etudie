import { CircleHelp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { EtatVide } from '@/components/ui/etat-vide';
import { create } from '@/routes/contenu/questions';
import type { QuestionDisponible } from './extensions';

/**
 * Choisir la mini-question à glisser dans la leçon : les questions publiées
 * du chapitre (l'élève les reçoit dans l'objet de la leçon, même hors ligne).
 */
export function DialogueMiniQuestion({
    ouvert,
    fermer,
    questions,
    inserer,
}: {
    ouvert: boolean;
    fermer: () => void;
    questions: QuestionDisponible[];
    inserer: (uuid: string) => void;
}) {
    return (
        <Dialog open={ouvert} onOpenChange={(o) => !o && fermer()}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Une mini-question de vérification</DialogTitle>
                    <DialogDescription>
                        L’élève y répond sans quitter la leçon. Seules les
                        questions publiées du chapitre sont proposées.
                    </DialogDescription>
                </DialogHeader>
                {questions.length === 0 ? (
                    <EtatVide
                        illustration={CircleHelp}
                        titre="Pas encore de question publiée"
                        message="Écrivez une question sur une notion de ce chapitre, faites-la relire : elle apparaîtra ici."
                        action={
                            <Button asChild variant="outline" taille="compacte">
                                <a href={create().url}>Écrire une question</a>
                            </Button>
                        }
                        className="border-0 shadow-none"
                    />
                ) : (
                    <ul className="-mx-1 grid max-h-[55dvh] gap-1 overflow-y-auto px-1">
                        {questions.map((question) => (
                            <li key={question.uuid}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        inserer(question.uuid);
                                        fermer();
                                    }}
                                    className="grid w-full gap-0.5 rounded-controle px-3 py-2.5 text-left outline-none hover:bg-craie-100 focus-visible:outline-2 focus-visible:outline-ring dark:hover:bg-white/[0.04]"
                                >
                                    <span className="line-clamp-2 text-interface font-medium text-ink-900">
                                        {question.extrait}
                                    </span>
                                    <span className="text-meta text-ink-500">
                                        {question.type} · {question.notion}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={fermer}>
                        Fermer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
