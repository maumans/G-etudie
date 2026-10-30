import { createInertiaApp, router } from '@inertiajs/react';
import type { ResolvedComponent } from '@inertiajs/react';
import { ConfirmProvider } from '@/components/ui/confirm-provider';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { brancherBarreNavigation } from '@/lib/barre-navigation';
import { chargerPage } from '@/lib/chargement-page';

// Le filet de démarrage de app.blade.php (HORS_LIGNE.md A.3.3) attend ce
// signal : sans lui, impossible de distinguer un démarrage lent d'un code absent.
window.__nkaramogoPret = true;

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

// La garde de navigation hors ligne (lot 0, étape 6) s'inscrira avant la barre.
brancherBarreNavigation(router);

void createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    // `resolve` fourni ici : le plugin @inertiajs/vite n'injecte alors pas le
    // sien, qui ne rattrape pas l'échec d'import après un déploiement.
    resolve: (name) =>
        chargerPage<ResolvedComponent>(
            name,
            import.meta.glob('./pages/**/*.tsx'),
        ),
    layout: (name) => {
        switch (true) {
            case name === 'welcome':
            case name === 'erreur':
            case name.startsWith('dev/'):
                return null;
            case name.startsWith('auth/'):
                return AuthLayout;
            case name.startsWith('settings/'):
                return [AppLayout, SettingsLayout];
            default:
                return AppLayout;
        }
    },
    strictMode: true,
    withApp(app) {
        return (
            <TooltipProvider delayDuration={0}>
                <ConfirmProvider>
                    {app}
                    <Toaster />
                </ConfirmProvider>
            </TooltipProvider>
        );
    },
    // Barre maison : resources/js/lib/barre-navigation.ts (CLAUDE.md § 4).
    progress: false,
});

// This will set light / dark mode on load...
initializeTheme();
