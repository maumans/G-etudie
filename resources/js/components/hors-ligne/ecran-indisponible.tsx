import { CloudOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { MotifIndisponible } from '@/lib/hors-ligne';
import {
    moteur,
    ouvrirEcranIndisponible,
    useEcranIndisponible,
} from '@/lib/hors-ligne';

/**
 * « Cet écran demande une connexion » (HORS_LIGNE.md A.3.7) : monté une fois
 * à la racine, pour tous les habillages. On reste sur l'écran ouvert (qui
 * peut contenir une séance en cours) : un dialogue, pas une page vide.
 *
 * Monté hors des pages (à côté de l'application) : pas de `usePage` ici. Le
 * moteur sait si le compte actif est un élève (tutoiement).
 */
const MESSAGES: Record<
    MotifIndisponible,
    { titre: string; eleve: string; autre: string }
> = {
    connexion_requise: {
        titre: 'Cet écran demande une connexion',
        eleve: 'Tu le retrouveras dès que le réseau revient. Ce que tu as fait est gardé sur ce téléphone.',
        autre: 'Il s’ouvrira dès que le réseau revient.',
    },
    pas_encore_ouvert: {
        titre: 'Pas encore ouvert sur ce téléphone',
        eleve: 'Cet écran n’a jamais été ouvert ici avec du réseau : il n’y en a pas de copie. Ouvre-le une fois connecté, il restera disponible.',
        autre: 'Cet écran n’a jamais été ouvert ici avec du réseau : il n’y en a pas de copie.',
    },
    ecriture: {
        titre: 'Cette action demande une connexion',
        eleve: 'Rien n’a été enregistré. Réessaie quand le réseau revient.',
        autre: 'Rien n’a été enregistré. Réessayez quand le réseau revient.',
    },
};

export function EcranIndisponible() {
    const motif = useEcranIndisponible();
    const eleve = moteur.utilisateur !== null;
    const message = motif ? MESSAGES[motif] : null;

    return (
        <Dialog
            open={message !== null}
            onOpenChange={(ouvert) => !ouvert && ouvrirEcranIndisponible(null)}
        >
            <DialogContent className="sm:max-w-sm">
                {message && (
                    <>
                        <DialogHeader>
                            <span
                                aria-hidden
                                className="mb-1 flex size-10 items-center justify-center rounded-[12px] bg-craie-100 text-ink-600"
                            >
                                <CloudOff className="size-[18px]" />
                            </span>
                            <DialogTitle>{message.titre}</DialogTitle>
                            <DialogDescription>
                                {eleve ? message.eleve : message.autre}
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button
                                onClick={() => ouvrirEcranIndisponible(null)}
                            >
                                Compris
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
