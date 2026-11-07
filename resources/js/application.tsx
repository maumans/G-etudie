import type { ResolvedComponent } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { EcranIndisponible } from '@/components/hors-ligne/ecran-indisponible';
import { ConfirmProvider } from '@/components/ui/confirm-provider';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { chargerModule, chargerPage } from '@/lib/chargement-page';
import { fichierHabillage, habillageDe } from '@/lib/habillages';

/**
 * Ce que le navigateur (`app.tsx`) et le rendu serveur (`ssr.tsx`, lot 8)
 * partagent : la résolution des pages, le titre et l'enveloppe de
 * l'application. Les deux doivent construire **exactement** le même arbre,
 * sinon React jette le HTML du serveur à l'hydratation.
 */
const pages = import.meta.glob('./pages/**/*.tsx');
const habillages = import.meta.glob('./layouts/*-layout.tsx');

const nomApplication = import.meta.env.VITE_APP_NAME || 'Laravel';

export const titrePage = (titre: string) =>
    titre ? `${titre} · ${nomApplication}` : nomApplication;

/**
 * L'habillage de l'espace (DESIGN.md § 7) arrive avec la page, à la demande
 * (lot 8) : la vitrine ne télécharge pas ceux des espaces. Le rattrapage
 * d'un échec d'import après un déploiement est dans `chargerPage`.
 */
export async function resoudrePage(nom: string): Promise<ResolvedComponent> {
    const habillage = habillageDe(nom);
    const [page, layout] = await Promise.all([
        chargerPage<ResolvedComponent>(nom, pages),
        habillage
            ? chargerModule<ResolvedComponent>(
                  fichierHabillage(habillage),
                  habillages,
              )
            : null,
    ]);

    (page as { layout?: unknown }).layout = layout ?? undefined;

    return page;
}

export function envelopperApplication(application: ReactNode) {
    return (
        <TooltipProvider delayDuration={0}>
            <ConfirmProvider>
                {application}
                <EcranIndisponible />
                <Toaster />
            </ConfirmProvider>
        </TooltipProvider>
    );
}
