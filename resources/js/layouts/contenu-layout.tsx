import type { ReactNode } from 'react';
import { CoquePersonnel } from '@/components/coque-personnel';
import { NAVIGATION_CONTENU } from '@/lib/navigation';

/**
 * Back-office contenu (DESIGN.md § 7) : dense, calme, chrome claire et
 * achromatique ; la couleur est réservée aux statuts.
 */
export default function ContenuLayout({ children }: { children: ReactNode }) {
    return (
        <CoquePersonnel
            espace="Back-office contenu"
            entrees={NAVIGATION_CONTENU}
        >
            {children}
        </CoquePersonnel>
    );
}
