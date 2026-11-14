import { KeyRound } from 'lucide-react';
import type { MotDePasseProvisoire } from '@/types/suivi';

/**
 * Le mot de passe provisoire d'un compte du personnel qu'on vient d'ouvrir
 * (lot 11) : montré **une fois**, sur l'écran qui suit, à transmettre de
 * vive voix ; la personne le change dans « Mon compte ».
 */
export function AvisMotDePasseProvisoire({
    avis,
}: {
    avis: MotDePasseProvisoire;
}) {
    if (avis === null) {
        return null;
    }

    return (
        <section
            role="status"
            className="flex flex-col gap-3 rounded-carte border border-indice-400/45 bg-indice-400/[0.08] p-4 sm:flex-row sm:items-center dark:bg-indice-400/[0.06]"
        >
            <KeyRound
                aria-hidden
                className="hidden size-5 shrink-0 text-indice-600 sm:block dark:text-indice-400"
            />
            <p className="flex-1 text-ink-600">
                <span className="font-semibold text-ink-900">
                    Compte de {avis.prenom} ouvert.
                </span>{' '}
                Son mot de passe provisoire, à lui transmettre de vive voix (il
                ne sera plus affiché) :
            </p>
            <code
                className="rounded-controle bg-relief px-3 py-1.5 text-[1.0625rem] font-bold tracking-wider font-data ring-1 ring-black/5"
                data-capture="variable"
            >
                {avis.mot_de_passe}
            </code>
        </section>
    );
}
