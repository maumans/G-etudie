import type { ReactNode } from 'react';
import { CoquePersonnel } from '@/components/coque-personnel';
import { NAVIGATION_ENSEIGNANT } from '@/lib/navigation';

/** Espace enseignant (lot 11, PLAN M14) : ses groupes, ses devoirs, le suivi. */
export default function EnseignantLayout({
    children,
}: {
    children: ReactNode;
}) {
    return (
        <CoquePersonnel
            cle="enseignant"
            espace="Espace enseignant"
            entrees={NAVIGATION_ENSEIGNANT}
        >
            {children}
        </CoquePersonnel>
    );
}
