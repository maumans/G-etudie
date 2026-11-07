import { createInertiaApp } from '@inertiajs/react';
import { envelopperApplication, resoudrePage, titrePage } from '@/application';

/**
 * Rendu serveur (lot 8) : seule la vitrine passe ici
 * (`App\Support\Habillages::renduServeur`, `App\Ssr\PasserelleVitrine`).
 * La page arrive construite — l'illustration du héros s'affiche sans
 * attendre React — et le navigateur l'hydrate (`app.tsx`).
 *
 * Le plugin `@inertiajs/vite` enveloppe cet appel : en développement, Vite
 * sert le rendu sur `/__inertia_ssr` ; en production, `npm run build:ssr`
 * produit `bootstrap/ssr/ssr.js`, que `php artisan inertia:start-ssr` sert
 * sur le port 13714 (MISE_EN_PRODUCTION.md).
 *
 * Rien ici ne touche `window` : ni service worker, ni hors ligne, ni thème —
 * ils démarrent dans le navigateur.
 */
void createInertiaApp({
    title: titrePage,
    resolve: resoudrePage,
    strictMode: true,
    withApp: envelopperApplication,
});
