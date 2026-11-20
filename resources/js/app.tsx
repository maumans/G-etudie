import { createInertiaApp, router } from '@inertiajs/react';
import { envelopperApplication, resoudrePage, titrePage } from '@/application';
import { initializeTheme } from '@/hooks/use-appearance';
import { initialiserReglagesAffichage } from '@/hooks/use-reglages-affichage';
import { brancherBarreNavigation } from '@/lib/barre-navigation';
import { demarrerHorsLigne } from '@/lib/hors-ligne';
import { demarrerTerrain } from '@/lib/terrain';

// Le filet de démarrage de app.blade.php (HORS_LIGNE.md A.3.3) attend ce
// signal : sans lui, impossible de distinguer un démarrage lent d'un code absent.
window.__nkaramogoPret = true;
// Démarrage lent mais réussi : le filet s'était peut-être ouvert, on le referme.
document
    .getElementById('filet-demarrage')
    ?.style.setProperty('display', 'none');

// Garde de navigation hors ligne d'abord : la barre ignore une visite annulée
// (HORS_LIGNE.md A.3.7).
demarrerHorsLigne(router);
brancherBarreNavigation(router);
// Lot 14 (terrain) : erreurs captées et envoyées par la file.
demarrerTerrain(router);

void createInertiaApp({
    title: titrePage,
    // `resolve` fourni ici : le plugin @inertiajs/vite n'injecte alors pas le
    // sien, qui ne rattrape pas l'échec d'import après un déploiement.
    resolve: resoudrePage,
    strictMode: true,
    // Même enveloppe que le rendu serveur (ssr.tsx) : la vitrine arrive
    // construite et React l'hydrate au lieu de la refaire (lot 8).
    withApp: envelopperApplication,
    // Barre maison : resources/js/lib/barre-navigation.ts (CLAUDE.md § 4).
    progress: false,
});

// Thème clair / sombre, puis taille du texte et mode données, dès le chargement.
initializeTheme();
initialiserReglagesAffichage();
