import type { ReactNode } from 'react';
import { CoquePersonnel } from '@/components/coque-personnel';
import { NAVIGATION_ETABLISSEMENT } from '@/lib/navigation';

/** Espace établissement (lot 11, PLAN M14) : rapport, enseignants, licences. */
export default function EtablissementLayout({
    children,
}: {
    children: ReactNode;
}) {
    return (
        <CoquePersonnel
            cle="etablissement"
            espace="Espace établissement"
            entrees={NAVIGATION_ETABLISSEMENT}
        >
            {children}
        </CoquePersonnel>
    );
}
