import { usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { CoquePersonnel } from '@/components/coque-personnel';
import ConsoleLayout from '@/layouts/console-layout';
import ContenuLayout from '@/layouts/contenu-layout';
import EleveLayout from '@/layouts/eleve-layout';
import { NAVIGATION_COMPTE } from '@/lib/navigation';

/**
 * « Mon compte » garde l'habillage de l'espace où le compte arrive : l'élève
 * reste dans l'espace élève, le personnel dans le back-office ou la console.
 * Un compte sans espace (parent, enseignant, gestionnaire avant le lot 11) a
 * une coque réduite à « Mon compte ».
 */
export default function CompteLayout({ children }: { children: ReactNode }) {
    const { auth } = usePage().props;

    switch (auth.user?.espace) {
        case 'console':
            return <ConsoleLayout>{children}</ConsoleLayout>;
        case 'contenu':
            return <ContenuLayout>{children}</ContenuLayout>;
        case 'eleve':
            return <EleveLayout>{children}</EleveLayout>;
        default:
            return (
                <CoquePersonnel espace="Mon compte" entrees={NAVIGATION_COMPTE}>
                    {children}
                </CoquePersonnel>
            );
    }
}
