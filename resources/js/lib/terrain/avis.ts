import type { BaseHorsLigne } from '@/lib/hors-ligne/base';

/**
 * « Ton avis » (lot 14 ; la plaquette : « test d'essai, critiques, prise en
 * compte »). Mêmes clés que App\Enums\EtiquetteAvis et ReponseAvis ; le
 * geste part par la file (`avis.donner`), hors ligne aussi.
 */

export type ReponseAvis = 'oui' | 'un_peu' | 'non';

export type EcranAvis = 'seance' | 'quiz' | 'devoir' | 'appareils' | 'menu';

export const REPONSES: { cle: ReponseAvis; libelle: string }[] = [
    { cle: 'oui', libelle: 'Oui' },
    { cle: 'un_peu', libelle: 'Un peu' },
    { cle: 'non', libelle: 'Non' },
];

export const ETIQUETTES: { cle: string; libelle: string }[] = [
    { cle: 'lent', libelle: 'C’est lent' },
    { cle: 'donnees', libelle: 'Ça consomme trop de données' },
    { cle: 'pas_compris', libelle: 'Je ne sais pas quoi faire' },
    { cle: 'difficile', libelle: 'Trop difficile' },
    { cle: 'facile', libelle: 'Trop facile' },
    { cle: 'bug', libelle: 'Quelque chose ne marche pas' },
];

export const COMMENTAIRE_MAX = 300;

/** Après une séance, la carte « Ton avis » revient au plus une fois par semaine. */
export const INTERVALLE_PROPOSITION_MS = 7 * 24 * 3600_000;

const cle = (auteur: number) => `avis_propose_${auteur}`;

export async function doitProposerAvis(
    base: BaseHorsLigne,
    auteur: number | null,
    maintenant: number = Date.now(),
): Promise<boolean> {
    if (auteur === null) {
        return false;
    }

    try {
        const dernier = await base.lireMeta<number>(cle(auteur));

        return (
            dernier === undefined ||
            maintenant - dernier >= INTERVALLE_PROPOSITION_MS
        );
    } catch {
        return false;
    }
}

/** Noté dès que la carte est montrée : fermée ou remplie, elle attend une semaine. */
export async function noterAvisPropose(
    base: BaseHorsLigne,
    auteur: number,
    maintenant: number = Date.now(),
): Promise<void> {
    try {
        await base.ecrireMeta(cle(auteur), maintenant);
    } catch {
        // Stockage indisponible : la carte reviendra, rien de grave.
    }
}

/** La charge de `avis.donner`, propre : étiquettes connues, commentaire coupé. */
export function chargeAvis(saisie: {
    ecran: EcranAvis;
    reponse: ReponseAvis;
    etiquettes: string[];
    commentaire: string;
    version: string | null;
}): Record<string, unknown> {
    const connues = new Set(ETIQUETTES.map((e) => e.cle));
    const commentaire = saisie.commentaire.trim().slice(0, COMMENTAIRE_MAX);

    return {
        ecran: saisie.ecran,
        reponse: saisie.reponse,
        etiquettes: [...new Set(saisie.etiquettes)].filter((e) =>
            connues.has(e),
        ),
        commentaire: commentaire === '' ? null : commentaire,
        version_app: saisie.version,
    };
}
