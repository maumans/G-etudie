/**
 * Barre de progression de navigation (CLAUDE.md § 4), à la place de celle
 * d'Inertia (`progress: false`), qui s'arrête à la réponse réseau et non à
 * l'affichage, attend 250 ms avant de paraître et ne voit pas les visites
 * servies par le préchargement.
 *
 * - démarre sur l'événement `before` (toute visite affichée, cache compris) ;
 *   les préchargements et les rechargements en arrière-plan sont ignorés ;
 * - n'affiche rien si la visite dure moins de 80 ms ;
 * - avance par une animation CSS sur `transform` (jouée par le compositeur,
 *   elle avance même pendant un gros rendu React) ;
 * - se termine après le signal `finish` **et** un double
 *   `requestAnimationFrame` (le second ne tire qu'une fois la page peinte) ;
 * - sur annulation ou erreur, s'efface sans aller à 100 %.
 * Styles : `.barre-navigation` dans resources/css/app.css.
 */

export const DELAI_AFFICHAGE_MS = 80;
export const DUREE_DISPARITION_MS = 250;
/** Au-delà, la barre se termine même si aucune image n'a été peinte. */
export const DELAI_SECOURS_FIN_MS = 1000;

type VisiteObservee = {
    prefetch?: boolean;
    showProgress?: boolean;
    completed?: boolean;
    cancelled?: boolean;
    interrupted?: boolean;
};

type EvenementVisite = {
    detail: { visit: VisiteObservee };
    defaultPrevented?: boolean;
};

export type RouteurObserve = {
    on(
        evenement: 'before' | 'finish',
        rappel: (evenement: EvenementVisite) => void,
    ): () => void;
};

type Dependances = {
    document: Document;
    planifier: (rappel: () => void, delaiMs: number) => unknown;
    annuler: (identifiant: unknown) => void;
    prochaineImage: (rappel: () => void) => void;
};

const parDefaut = (): Dependances => ({
    document,
    planifier: (rappel, delaiMs) => setTimeout(rappel, delaiMs),
    annuler: (identifiant) =>
        clearTimeout(identifiant as ReturnType<typeof setTimeout>),
    prochaineImage: (rappel) => requestAnimationFrame(() => rappel()),
});

export function brancherBarreNavigation(
    routeur: RouteurObserve,
    dependances: Dependances = parDefaut(),
): () => void {
    const { document: doc, planifier, annuler, prochaineImage } = dependances;
    let barre: HTMLDivElement | null = null;
    let minuteur: unknown = null;
    let visitesEnCours = 0;

    function afficher() {
        minuteur = null;
        barre?.remove();
        barre = doc.createElement('div');
        barre.className = 'barre-navigation';
        barre.setAttribute('aria-hidden', 'true');
        barre.dataset.etat = 'avance';
        doc.body.appendChild(barre);
    }

    function effacer(element: HTMLDivElement, jusquAuBout: boolean) {
        element.dataset.etat = jusquAuBout ? 'terminee' : 'abandonnee';
        planifier(() => element.remove(), DUREE_DISPARITION_MS);
    }

    function terminer(jusquAuBout: boolean) {
        if (minuteur !== null) {
            annuler(minuteur);
            minuteur = null;
        }

        const element = barre;
        barre = null;

        if (!element) {
            return;
        }

        if (!jusquAuBout) {
            effacer(element, false);

            return;
        }

        // Le premier rappel tire avant la peinture de la nouvelle page, le
        // second une fois qu'elle est à l'écran. Un onglet en arrière-plan ne
        // peint plus (requestAnimationFrame se tait) : fin de secours.
        let finie = false;
        const finir = () => {
            if (!finie) {
                finie = true;
                effacer(element, true);
            }
        };

        prochaineImage(() => prochaineImage(finir));
        planifier(finir, DELAI_SECOURS_FIN_MS);
    }

    const ignoree = (visite: VisiteObservee) =>
        visite.prefetch === true || visite.showProgress === false;

    const desabonner = [
        routeur.on('before', (evenement) => {
            // Une visite annulée par un écouteur inscrit avant (garde hors
            // ligne, HORS_LIGNE.md A.3.7) n'aura jamais de `finish`.
            if (evenement.defaultPrevented || ignoree(evenement.detail.visit)) {
                return;
            }

            visitesEnCours++;

            if (minuteur === null && barre === null) {
                minuteur = planifier(afficher, DELAI_AFFICHAGE_MS);
            }
        }),
        routeur.on('finish', ({ detail }) => {
            if (ignoree(detail.visit)) {
                return;
            }

            visitesEnCours = Math.max(0, visitesEnCours - 1);

            // Une visite interrompue par une autre : la barre continue.
            if (detail.visit.interrupted || visitesEnCours > 0) {
                return;
            }

            terminer(
                detail.visit.completed === true && !detail.visit.cancelled,
            );
        }),
    ];

    return () => desabonner.forEach((arreter) => arreter());
}
