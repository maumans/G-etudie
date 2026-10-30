import type { ReactNode } from 'react';
import { CoquePersonnel } from '@/components/coque-personnel';
import { NAVIGATION_CONSOLE } from '@/lib/navigation';

/**
 * Console plateforme (DESIGN.md § 7) : barre latérale sombre — on n'est pas
 * « dans » une école, on est au-dessus. Signal permanent, pas un message
 * qu'on ferme.
 */
export default function ConsoleLayout({ children }: { children: ReactNode }) {
    return (
        <CoquePersonnel
            espace="Console plateforme"
            entrees={NAVIGATION_CONSOLE}
            sombre
        >
            {children}
        </CoquePersonnel>
    );
}
