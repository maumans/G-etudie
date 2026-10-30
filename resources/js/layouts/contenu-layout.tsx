import type { ReactNode } from 'react';
import { CoquePersonnel } from '@/components/coque-personnel';
import { usePeut } from '@/hooks/use-peut';
import { NAVIGATION_CONTENU } from '@/lib/navigation';

/**
 * Back-office contenu (DESIGN.md § 7) : dense, calme, chrome claire et
 * achromatique ; la couleur est réservée aux statuts.
 */
export default function ContenuLayout({ children }: { children: ReactNode }) {
    const peut = usePeut();
    const entrees = NAVIGATION_CONTENU.filter(
        (entree) => !entree.permission || peut(entree.permission),
    );

    return (
        <CoquePersonnel
            cle="contenu"
            espace="Back-office contenu"
            entrees={entrees}
        >
            {children}
        </CoquePersonnel>
    );
}
