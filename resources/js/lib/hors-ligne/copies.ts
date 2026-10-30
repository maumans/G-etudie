/**
 * Copies datées (HORS_LIGNE.md A.3.8) : quand le service worker sert la copie
 * gardée d'un écran, il y glisse son heure (`props.copie_hors_ligne`, ou la
 * balise `<meta name="copie-hors-ligne">` d'un document). Ici : ce que dit le
 * bandeau, selon l'écran.
 *
 * `lecture` : l'écran s'actualise seul au retour du réseau, une fois par
 * retour ; un écran de saisie ne bouge jamais.
 */

type Copie = { sujet: string; lecture: boolean };

const ECRANS: Record<string, Copie> = {
    'eleve/accueil': { sujet: 'Accueil', lecture: true },
    'compte/affichage': { sujet: 'Affichage', lecture: false },
};

export function copieDe(composant: string): Copie {
    return ECRANS[composant] ?? { sujet: 'Page', lecture: false };
}

const HEURE = new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
});

const JOUR = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
});

/** « Accueil au 21:14 » aujourd'hui ; « Accueil au 29 oct. à 21:14 » avant. */
export function texteCopie(
    composant: string,
    iso: string,
    maintenant: Date = new Date(),
): string {
    const date = new Date(iso);
    const { sujet } = copieDe(composant);

    if (Number.isNaN(date.getTime())) {
        return `${sujet} — dernière version gardée sur ce téléphone`;
    }

    const quand =
        date.toDateString() === maintenant.toDateString()
            ? HEURE.format(date)
            : `${JOUR.format(date)} à ${HEURE.format(date)}`;

    return `${sujet} au ${quand} — dernière version gardée sur ce téléphone`;
}

/**
 * Heure de la copie : prop de la page (visite Inertia), sinon celle du
 * document chargé (`copieDuDocument`).
 */
export function heureCopie(
    props: Record<string, unknown>,
    deDocument: string | null,
): string | null {
    return typeof props.copie_hors_ligne === 'string'
        ? props.copie_hors_ligne
        : deDocument;
}
