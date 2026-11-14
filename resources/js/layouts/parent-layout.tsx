import type { ReactNode } from 'react';
import { CoquePersonnel } from '@/components/coque-personnel';
import { NAVIGATION_PARENT } from '@/lib/navigation';

/**
 * Espace parent (lot 11, PLAN M15) : la coque calme des espaces adultes,
 * deux entrées. Le parent suit en lecture seule ; il vouvoie et est vouvoyé.
 */
export default function ParentLayout({ children }: { children: ReactNode }) {
    return (
        <CoquePersonnel
            cle="parent"
            espace="Espace parent"
            entrees={NAVIGATION_PARENT}
        >
            {children}
        </CoquePersonnel>
    );
}
