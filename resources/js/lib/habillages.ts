/**
 * L'habillage (layout) de chaque page, d'après son dossier (DESIGN.md § 7).
 *
 * Lot 8 : les habillages sont chargés **à la demande, avec leur page**, et
 * non plus tous dans le paquet de démarrage. La vitrine ne télécharge ainsi
 * ni l'espace élève, ni le back-office, ni la console (critère Lighthouse).
 *
 * `App\Support\Habillages` (PHP) fait la même correspondance pour précharger
 * le fichier dans le document ; `tests/fixtures/habillages.json` teste les
 * deux.
 */
export type Habillage =
    | 'vitrine'
    | 'eleve'
    | 'contenu'
    | 'console'
    | 'connexion'
    | 'compte';

export function habillageDe(page: string): Habillage | null {
    switch (true) {
        case page === 'erreur':
        case page.startsWith('dev/'):
        // Plein écran, sans navigation : l'ardoise (DESIGN.md § 6.4) et le
        // parcours d'accueil portent leur propre cadre.
        case page === 'eleve/seance':
        case page === 'eleve/bienvenue':
            return null;
        case page.startsWith('vitrine/'):
            return 'vitrine';
        case page.startsWith('eleve/'):
            return 'eleve';
        case page.startsWith('contenu/'):
            return 'contenu';
        case page.startsWith('console/'):
            return 'console';
        case page.startsWith('auth/'):
            return 'connexion';
        // « Mon compte » : dans l'habillage de l'espace du compte.
        case page.startsWith('compte/'):
            return 'compte';
        default:
            return null;
    }
}

/** Clé de l'habillage dans `import.meta.glob('./layouts/*-layout.tsx')`. */
export const fichierHabillage = (habillage: Habillage) =>
    `./layouts/${habillage}-layout.tsx`;
