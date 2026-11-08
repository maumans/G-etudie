import { usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import type { BaseHorsLigne } from '@/lib/hors-ligne/base';

/**
 * Ce que l'abonnement ouvre, vu de l'appareil (lot 9). Le serveur l'envoie
 * avec chaque page élève (`droits`, App\Support\DroitsAbonne::pourAppareil) ;
 * la copie hors ligne de la page le garde, et l'appareil y ajoute ce qu'il
 * sait de plus : les examens blancs commencés ici et pas encore reçus.
 */
export type DroitsAppareil = {
    abonne: boolean;
    fin: string | null;
    examens_blancs: {
        /** `null` : sans limite (abonné). */
        limite: number | null;
        /** Examens commencés ce mois que le serveur a reçus. */
        faits: number;
        /** « 2026-11 » : le mois de ce décompte. */
        mois: string;
    };
};

export const DROITS_PAR_DEFAUT: DroitsAppareil = {
    abonne: false,
    fin: null,
    examens_blancs: { limite: null, faits: 0, mois: '' },
};

/** « 2026-11 » pour une date de l'appareil. */
export function moisDe(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Les examens blancs commencés **sur ce téléphone** ce mois et que le
 * serveur n'a pas encore comptés : en cours (table `examens_blancs`) ou
 * terminés mais en attente d'envoi (file d'opérations).
 */
export async function examensLocauxDuMois(
    base: BaseHorsLigne,
    auteur: number,
    maintenant: Date,
): Promise<number> {
    const mois = moisDe(maintenant);
    const enCours = (await base.examens_blancs
        .where('auteur_id')
        .equals(auteur)
        .toArray()) as { commence_le?: string }[];
    const enAttente = (
        await base.operations.where('auteur_id').equals(auteur).toArray()
    ).filter((op) => op.type === 'examen_blanc.terminer');

    return [
        ...enCours.map((e) => e.commence_le),
        ...enAttente.map((op) => op.charge.commence_le as string | undefined),
    ].filter((d) => typeof d === 'string' && moisDe(new Date(d)) === mois)
        .length;
}

/**
 * Combien d'examens blancs l'élève peut encore commencer ce mois (`null` :
 * sans limite). Un décompte d'un autre mois (copie ancienne) ne compte plus.
 */
export function examensRestants(
    droits: DroitsAppareil,
    locaux: number,
    maintenant: Date,
): number | null {
    const { limite, faits, mois } = droits.examens_blancs;

    if (limite === null) {
        return null;
    }

    const recus = mois === moisDe(maintenant) ? faits : 0;

    return Math.max(0, limite - recus - locaux);
}

/** Les droits de la page (shared prop), ou ceux d'un compte gratuit sans décompte. */
export function useDroits(): DroitsAppareil {
    const { droits } = usePage().props as { droits?: DroitsAppareil | null };

    return droits ?? DROITS_PAR_DEFAUT;
}

/** Le reste d'examens blancs du mois, complété par ce que sait l'appareil. */
export function useExamensRestants(
    base: BaseHorsLigne,
    auteur: number,
): { restants: number | null; pret: boolean } {
    const droits = useDroits();
    const [locaux, setLocaux] = useState<number | null>(null);

    useEffect(() => {
        let actif = true;

        if (droits.examens_blancs.limite === null) {
            setLocaux(0);

            return;
        }

        void examensLocauxDuMois(base, auteur, new Date())
            .then((n) => actif && setLocaux(n))
            .catch(() => actif && setLocaux(0));

        return () => {
            actif = false;
        };
    }, [base, auteur, droits.examens_blancs.limite]);

    return {
        restants:
            locaux === null
                ? null
                : examensRestants(droits, locaux, new Date()),
        pret: locaux !== null,
    };
}
