import { Head, Link } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn } from '@/lib/utils';
import { index as annees } from '@/routes/contenu/referentiel/annees';
import { index as epreuves } from '@/routes/contenu/referentiel/epreuves';
import { index as matieres } from '@/routes/contenu/referentiel/matieres';
import { index as programme } from '@/routes/contenu/referentiel/programme';

/**
 * En-tête d'un écran du back-office : grand titre en contraste (la phrase en
 * léger, le mot clé en `<strong>`), une précision, l'action dominante à
 * droite (en dessous sur mobile).
 */
export function EnteteEcran({
    titreOnglet,
    titre,
    description,
    action,
    children,
}: {
    titreOnglet: string;
    titre: ReactNode;
    description?: ReactNode;
    action?: ReactNode;
    children?: ReactNode;
}) {
    return (
        <div className="grid gap-4">
            <Head title={titreOnglet} />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="grid max-w-2xl gap-1">
                    <h1 className="text-titre-ecran titre-contraste lg:text-titre-ecran-large">
                        {titre}
                    </h1>
                    {description && (
                        <p className="text-ink-600">{description}</p>
                    )}
                </div>
                {action && <div className="flex shrink-0 gap-2">{action}</div>}
            </div>
            {children}
        </div>
    );
}

const ONGLETS_REFERENTIEL = [
    { libelle: 'Matières', href: matieres().url },
    { libelle: 'Épreuves', href: epreuves().url },
    { libelle: 'Programme', href: programme().url },
    { libelle: 'Années', href: annees().url },
];

/** Onglets du référentiel, sur le modèle de « Mon compte ». */
export function OngletsReferentiel() {
    const { isCurrentOrParentUrl } = useCurrentUrl();

    return (
        <nav
            aria-label="Référentiel"
            className="grid grid-cols-4 gap-0.5 rounded-controle bg-craie-100 p-1 sm:inline-flex sm:w-fit"
        >
            {ONGLETS_REFERENTIEL.map((onglet) => {
                const actif = isCurrentOrParentUrl(onglet.href);

                return (
                    <Link
                        key={onglet.href}
                        href={onglet.href}
                        prefetch
                        aria-current={actif ? 'page' : undefined}
                        className={cn(
                            'flex h-9 items-center justify-center rounded-[7px] px-2 text-aide font-medium whitespace-nowrap transition-colors outline-none focus-visible:outline-2 focus-visible:outline-ring sm:h-8 sm:px-3.5 sm:text-interface',
                            actif
                                ? 'bg-relief text-ink-900 shadow-xs ring-1 ring-black/5 dark:ring-white/5'
                                : 'text-ink-600 hover:text-ink-900',
                        )}
                    >
                        {onglet.libelle}
                    </Link>
                );
            })}
        </nav>
    );
}
