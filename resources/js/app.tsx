import { createInertiaApp, router } from '@inertiajs/react';
import type { ResolvedComponent } from '@inertiajs/react';
import { EcranIndisponible } from '@/components/hors-ligne/ecran-indisponible';
import { ConfirmProvider } from '@/components/ui/confirm-provider';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import { initialiserReglagesAffichage } from '@/hooks/use-reglages-affichage';
import { brancherBarreNavigation } from '@/lib/barre-navigation';
import { chargerModule, chargerPage } from '@/lib/chargement-page';
import { fichierHabillage, habillageDe } from '@/lib/habillages';
import { demarrerHorsLigne } from '@/lib/hors-ligne';

// Le filet de démarrage de app.blade.php (HORS_LIGNE.md A.3.3) attend ce
// signal : sans lui, impossible de distinguer un démarrage lent d'un code absent.
window.__nkaramogoPret = true;
// Démarrage lent mais réussi : le filet s'était peut-être ouvert, on le referme.
document
    .getElementById('filet-demarrage')
    ?.style.setProperty('display', 'none');

const pages = import.meta.glob('./pages/**/*.tsx');
const habillages = import.meta.glob('./layouts/*-layout.tsx');

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

// Garde de navigation hors ligne d'abord : la barre ignore une visite annulée
// (HORS_LIGNE.md A.3.7).
demarrerHorsLigne(router);
brancherBarreNavigation(router);

void createInertiaApp({
    title: (title) => (title ? `${title} · ${appName}` : appName),
    // `resolve` fourni ici : le plugin @inertiajs/vite n'injecte alors pas le
    // sien, qui ne rattrape pas l'échec d'import après un déploiement.
    // L'habillage de l'espace (DESIGN.md § 7) arrive avec la page, à la
    // demande (lot 8) : la vitrine ne télécharge pas ceux des espaces.
    resolve: async (name) => {
        const habillage = habillageDe(name);
        const [page, layout] = await Promise.all([
            chargerPage<ResolvedComponent>(name, pages),
            habillage
                ? chargerModule<ResolvedComponent>(
                      fichierHabillage(habillage),
                      habillages,
                  )
                : null,
        ]);

        (page as { layout?: unknown }).layout = layout ?? undefined;

        return page;
    },
    strictMode: true,
    withApp(app) {
        return (
            <TooltipProvider delayDuration={0}>
                <ConfirmProvider>
                    {app}
                    <EcranIndisponible />
                    <Toaster />
                </ConfirmProvider>
            </TooltipProvider>
        );
    },
    // Barre maison : resources/js/lib/barre-navigation.ts (CLAUDE.md § 4).
    progress: false,
});

// Thème clair / sombre, puis taille du texte et mode données, dès le chargement.
initializeTheme();
initialiserReglagesAffichage();
