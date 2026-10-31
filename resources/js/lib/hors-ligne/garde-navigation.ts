import { estEcranGarde } from '@/lib/hors-ligne/ecrans';

/**
 * Garde de navigation (HORS_LIGNE.md A.3.7) : hors ligne, jamais de clic
 * mort. Inscrite **avant** la barre de progression, qui ignore une visite
 * annulée.
 *
 * - `before` : hors ligne, une visite vers un écran sans copie possible est
 *   annulée et le dialogue s'ouvre ; un préchargement est annulé en silence ;
 *   une écriture est annulée (« rien n'a été enregistré ») ;
 * - `networkError` (la visite est partie quand même) : un écran qui sait
 *   s'afficher depuis un pack l'est (HORS_LIGNE.md A.4, `afficherLocal`) ;
 *   sinon dialogue selon le cas, rechargement partiel tu, et « hors ligne »
 *   aussitôt.
 *
 * On reste sur l'écran ouvert : un dialogue, pas une page vide.
 */

export type MotifIndisponible =
    | 'connexion_requise'
    | 'pas_encore_ouvert'
    | 'ecriture';

type VisiteObservee = {
    url: URL;
    method: string;
    prefetch?: boolean;
    only?: string[];
    except?: string[];
    async?: boolean;
};

type EvenementObserve = {
    detail: { visit?: VisiteObservee };
    preventDefault: () => void;
};

export type RouteurGarde = {
    on(
        evenement: 'before' | 'start' | 'networkError',
        rappel: (evenement: EvenementObserve) => boolean | void,
    ): () => void;
};

export type DependancesGarde = {
    horsLigne: () => boolean;
    pages: () => string[];
    ouvrir: (motif: MotifIndisponible) => void;
    signalerHorsLigne: () => void;
    /** Affiche l'écran depuis la base locale ; `false` s'il n'y est pas. */
    afficherLocal?: (url: URL) => Promise<boolean>;
};

const estPartiel = (visite: VisiteObservee) =>
    (visite.only?.length ?? 0) > 0 ||
    (visite.except?.length ?? 0) > 0 ||
    visite.async === true;

export function initialiserGardeNavigation(
    routeur: RouteurGarde,
    dependances: DependancesGarde,
): () => void {
    let derniereVisite: VisiteObservee | null = null;

    const desabonnements = [
        routeur.on('before', (evenement) => {
            const visite = evenement.detail.visit;

            if (!visite || !dependances.horsLigne()) {
                return;
            }

            const ecriture = visite.method.toLowerCase() !== 'get';
            const gardee =
                visite.url.origin === window.location.origin &&
                estEcranGarde(visite.url.pathname, dependances.pages());

            if (!ecriture && gardee) {
                return;
            }

            evenement.preventDefault();

            if (!visite.prefetch && !estPartiel(visite)) {
                dependances.ouvrir(ecriture ? 'ecriture' : 'connexion_requise');
            }

            return false;
        }),
        routeur.on('start', (evenement) => {
            derniereVisite = evenement.detail.visit ?? null;
        }),
        routeur.on('networkError', (evenement) => {
            dependances.signalerHorsLigne();
            evenement.preventDefault();
            const visite = derniereVisite;

            if (!visite || visite.prefetch || estPartiel(visite)) {
                return false;
            }

            // Écran gardé sans copie : « pas encore ouvert ici » ; écran hors
            // liste blanche : il demande une connexion, copie ou pas.
            const motif: MotifIndisponible =
                visite.method.toLowerCase() !== 'get'
                    ? 'ecriture'
                    : estEcranGarde(visite.url.pathname, dependances.pages())
                      ? 'pas_encore_ouvert'
                      : 'connexion_requise';

            if (motif === 'ecriture' || !dependances.afficherLocal) {
                dependances.ouvrir(motif);

                return false;
            }

            void dependances
                .afficherLocal(visite.url)
                .catch(() => false)
                .then((affiche) => affiche || dependances.ouvrir(motif));

            return false;
        }),
    ];

    return () => desabonnements.forEach((desabonner) => desabonner());
}
