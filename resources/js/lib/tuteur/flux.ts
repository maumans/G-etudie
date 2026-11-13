/**
 * La demande au tuteur et sa réponse en flux (lot 10, SSE sur un POST :
 * `EventSource` ne sait faire que des GET). Sans React, pour être testée.
 *
 * Tout refus arrive **avant** le flux, en JSON avec son statut (quota,
 * corrigé réservé, explication en cours) : `demanderAuTuteur` le rend tel
 * quel. Une fois le flux ouvert, la suite est faite d'événements :
 * `debut`, `texte`…, puis `fin` — ou `refus` (le texte entier, à la place),
 * ou `erreur`. Un flux qui se tait sans `fin` est une coupure.
 *
 * En ligne seulement (HORS_LIGNE.md A.2, niveau C) : rien ne passe par la
 * file d'opérations.
 */

export type DemandeTuteur =
    | 'expliquer'
    | 'etape'
    | 'plus_simple'
    | 'exemple'
    | 'question';

export type StatutReponse =
    | 'complete'
    | 'hors_sujet'
    | 'refus'
    | 'interrompue'
    | 'erreur';

export type CorpsDemande = {
    demande: DemandeTuteur;
    conversation?: string | null;
    question?: string;
    version?: number;
    etape?: number;
    reponse?: Record<string, unknown> | null;
    matiere?: string;
    texte?: string;
};

export type EvenementTuteur =
    | { type: 'debut'; conversation: string; demande: string }
    | { type: 'texte'; t: string }
    | { type: 'refus'; texte: string; statut: StatutReponse }
    | { type: 'erreur'; message: string }
    | {
          type: 'fin';
          message: string;
          statut: StatutReponse;
          depuis_cache: boolean;
          quota_restant: number;
          relances_restantes: number;
      };

export type RaisonRefus =
    | 'quota'
    | 'corrige_reserve'
    | 'en_cours'
    | 'conversation_finie'
    | 'texte_vide'
    | 'demande_invalide'
    | 'etape_inconnue'
    | 'introuvable'
    | 'validation'
    | 'reseau'
    | 'coupure'
    | 'serveur';

export type IssueDemande =
    | { ok: true }
    | { ok: false; raison: RaisonRefus; message: string };

export const MESSAGE_RESEAU =
    'Pas de connexion : le tuteur a besoin d’internet pour écrire. Réessaie quand le réseau revient.';

export const MESSAGE_COUPURE =
    'La connexion a coupé pendant l’explication. Ce qui est écrit reste ; réessaie pour la suite.';

/** Les événements complets d'un tampon SSE, et ce qui reste à compléter. */
export function decouperSse(tampon: string): {
    evenements: EvenementTuteur[];
    reste: string;
} {
    const blocs = tampon.replace(/\r\n/g, '\n').split('\n\n');
    const reste = blocs.pop() ?? '';
    const evenements: EvenementTuteur[] = [];

    for (const bloc of blocs) {
        let nom = 'message';
        const donnees: string[] = [];

        for (const ligne of bloc.split('\n')) {
            if (ligne.startsWith('event:')) {
                nom = ligne.slice(6).trim();
            } else if (ligne.startsWith('data:')) {
                donnees.push(ligne.slice(5).trimStart());
            }
        }

        try {
            const valeur = JSON.parse(donnees.join('\n')) as Record<
                string,
                unknown
            >;
            evenements.push({ type: nom, ...valeur } as EvenementTuteur);
        } catch {
            // Un bloc illisible (commentaire SSE, battement) est ignoré.
        }
    }

    return { evenements, reste };
}

function lireCookie(nom: string): string | null {
    if (typeof document === 'undefined') {
        return null;
    }

    const trouve = document.cookie
        .split('; ')
        .find((c) => c.startsWith(`${nom}=`));

    return trouve ? decodeURIComponent(trouve.slice(nom.length + 1)) : null;
}

/**
 * Envoie la demande ; chaque événement du flux passe par `surEvenement`
 * dès qu'il arrive.
 */
export async function demanderAuTuteur(
    url: string,
    corps: CorpsDemande,
    surEvenement: (evenement: EvenementTuteur) => void,
    signal?: AbortSignal,
): Promise<IssueDemande> {
    let reponse: Response;
    const xsrf = lireCookie('XSRF-TOKEN');

    try {
        reponse = await fetch(url, {
            method: 'POST',
            credentials: 'same-origin',
            cache: 'no-store',
            signal,
            headers: {
                Accept: 'text/event-stream, application/json',
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                ...(xsrf ? { 'X-XSRF-TOKEN': xsrf } : {}),
            },
            body: JSON.stringify(corps),
        });
    } catch {
        return { ok: false, raison: 'reseau', message: MESSAGE_RESEAU };
    }

    if (!reponse.ok || !reponse.body) {
        const json = (await reponse.json().catch(() => null)) as {
            message?: string;
            raison?: RaisonRefus;
            errors?: Record<string, string[]>;
        } | null;

        const raison: RaisonRefus =
            json?.raison ??
            (reponse.status === 404
                ? 'introuvable'
                : reponse.status === 422
                  ? 'validation'
                  : 'serveur');
        const message = json?.errors
            ? (Object.values(json.errors)[0]?.[0] ?? 'Demande refusée.')
            : (json?.message ??
              (raison === 'introuvable'
                  ? 'Cette question n’est plus proposée.'
                  : 'Le tuteur n’a pas pu répondre. Réessaie dans un instant.'));

        return { ok: false, raison, message };
    }

    const lecteur = reponse.body.getReader();
    const decodeur = new TextDecoder();
    let tampon = '';
    let conclu = false;

    try {
        for (;;) {
            const { value, done } = await lecteur.read();

            if (done) {
                break;
            }

            tampon += decodeur.decode(value, { stream: true });
            const { evenements, reste } = decouperSse(tampon);
            tampon = reste;

            for (const evenement of evenements) {
                if (evenement.type === 'fin' || evenement.type === 'erreur') {
                    conclu = true;
                }

                surEvenement(evenement);
            }
        }
    } catch {
        // Coupure réseau en plein flux, ou annulation.
    }

    if (!conclu) {
        if (signal?.aborted) {
            return { ok: true };
        }

        surEvenement({ type: 'erreur', message: MESSAGE_COUPURE });

        return { ok: false, raison: 'coupure', message: MESSAGE_COUPURE };
    }

    return { ok: true };
}

export type MotifSignalementTuteur = 'fausse' | 'pas_claire' | 'inadaptee';

/** Les motifs, avec les libellés de App\Enums\MotifSignalementTuteur. */
export const MOTIFS_SIGNALEMENT_TUTEUR: {
    valeur: MotifSignalementTuteur;
    libelle: string;
}[] = [
    { valeur: 'fausse', libelle: 'L’explication contient une erreur' },
    { valeur: 'pas_claire', libelle: 'Je ne comprends toujours pas' },
    { valeur: 'inadaptee', libelle: 'La réponse est déplacée' },
];

/** « Signaler cette réponse » (en ligne : la réponse vient d'être écrite). */
export async function signalerReponse(
    url: string,
    motif: MotifSignalementTuteur,
): Promise<boolean> {
    const xsrf = lireCookie('XSRF-TOKEN');

    try {
        const reponse = await fetch(url, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                ...(xsrf ? { 'X-XSRF-TOKEN': xsrf } : {}),
            },
            body: JSON.stringify({ motif }),
        });

        return reponse.ok;
    } catch {
        return false;
    }
}
