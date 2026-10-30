import { useSyncExternalStore } from 'react';

/**
 * Réglages d'affichage de « Mon compte » : taille du texte de lecture et
 * mode économie de données. Locaux à l'appareil, jamais synchronisés
 * (HORS_LIGNE.md A.2) ; le thème a son propre réglage (use-appearance).
 */
export type TailleLecture = 'petite' | 'normale' | 'grande';

/** DESIGN.md § 3 : corps de lecture 15 / 17 / 19 px. */
export const TAILLES_LECTURE: Record<TailleLecture, string> = {
    petite: '0.9375rem',
    normale: '1.0625rem',
    grande: '1.1875rem',
};

const CLE_TAILLE = 'nkaramogo:taille-lecture';
const CLE_ECONOMIE = 'nkaramogo:economie-donnees';

type Reglages = { taille: TailleLecture; economieDonnees: boolean };

const abonnes = new Set<() => void>();
let instantane: Reglages | null = null;

function lireStockage(cle: string): string | null {
    try {
        return localStorage.getItem(cle);
    } catch {
        return null;
    }
}

function ecrireStockage(cle: string, valeur: string): void {
    try {
        localStorage.setItem(cle, valeur);
    } catch {
        // Stockage indisponible (navigation privée) : le réglage vaut pour la session.
    }
}

function lire(): Reglages {
    const taille = lireStockage(CLE_TAILLE);

    return {
        taille: taille === 'petite' || taille === 'grande' ? taille : 'normale',
        economieDonnees: lireStockage(CLE_ECONOMIE) === '1',
    };
}

function appliquer(reglages: Reglages): void {
    document.documentElement.style.setProperty(
        '--taille-lecture',
        TAILLES_LECTURE[reglages.taille],
    );
    document.documentElement.dataset.economieDonnees = reglages.economieDonnees
        ? 'oui'
        : 'non';
}

/** À appeler au démarrage (app.tsx), avant le premier rendu. */
export function initialiserReglagesAffichage(): void {
    instantane = lire();
    appliquer(instantane);
}

function mettreAJour(changement: Partial<Reglages>): void {
    instantane = { ...(instantane ?? lire()), ...changement };

    ecrireStockage(CLE_TAILLE, instantane.taille);
    ecrireStockage(CLE_ECONOMIE, instantane.economieDonnees ? '1' : '0');
    appliquer(instantane);
    abonnes.forEach((rappel) => rappel());
}

export function useReglagesAffichage() {
    const reglages = useSyncExternalStore(
        (rappel) => {
            abonnes.add(rappel);

            return () => abonnes.delete(rappel);
        },
        () => (instantane ??= lire()),
        () => ({ taille: 'normale', economieDonnees: false }) as Reglages,
    );

    return {
        ...reglages,
        changerTaille: (taille: TailleLecture) => mettreAJour({ taille }),
        changerEconomieDonnees: (economieDonnees: boolean) =>
            mettreAJour({ economieDonnees }),
    };
}
