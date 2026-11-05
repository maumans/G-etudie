import { corriger, scoreAutoEvaluation } from '@/lib/contenu/questions';
import type { ReponseQuestion } from '@/lib/contenu/questions';
import type { SujetEleve } from '@/lib/contenu/sujets';
import type { BaseHorsLigne } from '@/lib/hors-ligne/base';
import type { NouveauGeste } from '@/lib/hors-ligne/moteur';
import { noteExamen } from './note';
import type { Note } from './note';

/**
 * Le passage d'un examen blanc, sur l'appareil (HORS_LIGNE.md A.8, HL3).
 *
 *  - **Sauvegarde continue** : chaque réponse et chaque changement de
 *    question sont écrits dans la table `examens_blancs` de Dexie **à chaque
 *    geste**, jamais sur un minuteur. Rouvrir l'application rouvre l'examen
 *    à la question en cours.
 *  - **Chronomètre** (HL-D5, « conditions réelles ») : calculé depuis
 *    l'heure de début, jamais en additionnant des secondes ; le temps court
 *    application fermée, comme le jour de l'examen.
 *  - **Horloge** : un recul, ou un saut de plus de 5 min pendant l'examen,
 *    est **signalé** sur le résultat, jamais sanctionné.
 *  - **Fin** : correction d'affichage, puis `examen_blanc.terminer` dans la
 *    file ; la ligne quitte la table (le service worker n'active une
 *    nouvelle version que sans examen en cours, A.3.1).
 */

export type OrigineDuree = 'imprimee' | 'epreuve' | 'choisie';

export type ReponseExamen = {
    version: number;
    reponse: ReponseQuestion | null;
    /** Critères cochés d'une rédaction, à la fin (auto-évaluation). */
    criteres: string[] | null;
};

export type ExamenLocal = {
    /** UUID v7 de l'examen, et de son opération `examen_blanc.terminer`. */
    id: string;
    auteur_id: number;
    sujet: string;
    version: number;
    duree_minutes: number;
    origine_duree: OrigineDuree;
    /** ISO 8601, horloge de l'appareil. */
    commence_le: string;
    question_courante: number;
    reponses: Record<string, ReponseExamen>;
    /** `en_cours`, puis `a_evaluer` (rédactions à auto-évaluer) avant l'envoi. */
    statut: 'en_cours' | 'a_evaluer';
    termine_le: string | null;
    temps_ecoule: boolean;
    /** Dernière heure vue pendant l'examen (ms), pour voir un recul. */
    derniere_heure: number;
    horloge_suspecte: boolean;
    motif_horloge: string | null;
};

/** Au-delà, un saut d'horloge pendant l'examen est signalé (A.8). */
export const SAUT_MAX_MS = 5 * 60_000;

/** Les durées proposées quand ni l'annale ni l'épreuve n'en donnent une. */
export const DUREES_AU_CHOIX = [60, 120, 180, 240];

type Table = BaseHorsLigne['examens_blancs'];

function table(base: BaseHorsLigne): Table {
    return base.examens_blancs;
}

/** La durée de l'examen : imprimée sur l'annale, sinon celle de l'épreuve. */
export function dureeConnue(
    sujet: SujetEleve,
    dureeEpreuve: number | null,
): { minutes: number; origine: OrigineDuree } | null {
    if (sujet.duree_minutes) {
        return { minutes: sujet.duree_minutes, origine: 'imprimee' };
    }

    return dureeEpreuve ? { minutes: dureeEpreuve, origine: 'epreuve' } : null;
}

export async function demarrer(
    base: BaseHorsLigne,
    options: {
        id: string;
        auteur: number;
        sujet: SujetEleve;
        duree_minutes: number;
        origine_duree: OrigineDuree;
        maintenant: number;
    },
): Promise<ExamenLocal> {
    const examen: ExamenLocal = {
        id: options.id,
        auteur_id: options.auteur,
        sujet: options.sujet.uuid,
        version: options.sujet.version,
        duree_minutes: options.duree_minutes,
        origine_duree: options.origine_duree,
        commence_le: new Date(options.maintenant).toISOString(),
        question_courante: 0,
        reponses: {},
        statut: 'en_cours',
        termine_le: null,
        temps_ecoule: false,
        derniere_heure: options.maintenant,
        horloge_suspecte: false,
        motif_horloge: null,
    };

    await table(base).put(examen);

    return examen;
}

/** L'examen de cet élève sur cette annale, pas encore envoyé. */
export async function examenEnCours(
    base: BaseHorsLigne,
    auteur: number,
    sujet?: string,
): Promise<ExamenLocal | null> {
    const lignes = (await table(base)
        .where('auteur_id')
        .equals(auteur)
        .toArray()) as unknown as ExamenLocal[];

    return lignes.find((e) => sujet === undefined || e.sujet === sujet) ?? null;
}

/** Écrit une modification **tout de suite** (chaque geste est gardé). */
async function modifier(
    base: BaseHorsLigne,
    id: string,
    changement: (examen: ExamenLocal) => Partial<ExamenLocal>,
): Promise<ExamenLocal> {
    return base.transaction('rw', table(base), async () => {
        const examen = (await table(base).get(id)) as unknown as
            | ExamenLocal
            | undefined;

        if (!examen) {
            throw new Error('Examen introuvable sur ce téléphone.');
        }

        const suivant = { ...examen, ...changement(examen) };
        await table(base).put(suivant as unknown as Record<string, unknown>);

        return suivant;
    });
}

export function repondre(
    base: BaseHorsLigne,
    id: string,
    question: string,
    version: number,
    reponse: ReponseQuestion | null,
): Promise<ExamenLocal> {
    return modifier(base, id, (examen) => ({
        reponses: {
            ...examen.reponses,
            [question]: { version, reponse, criteres: null },
        },
    }));
}

export function allerA(
    base: BaseHorsLigne,
    id: string,
    rang: number,
): Promise<ExamenLocal> {
    return modifier(base, id, () => ({ question_courante: Math.max(0, rang) }));
}

/** Fin de l'examen à l'heure de l'appareil (au plus tard, à la fin du temps). */
export function finDuTemps(examen: ExamenLocal): number {
    return Date.parse(examen.commence_le) + examen.duree_minutes * 60_000;
}

/** Le temps restant, calculé depuis l'heure de début (A.14 n° 21). */
export function tempsRestantMs(
    examen: ExamenLocal,
    maintenant: number,
): number {
    return Math.max(0, finDuTemps(examen) - maintenant);
}

/** « 1:05:09 », « 9:07 » : le chronomètre discret. */
export function formaterRestant(ms: number): string {
    const total = Math.ceil(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const deux = (n: number) => String(n).padStart(2, '0');

    return h > 0 ? `${h}:${deux(m)}:${deux(s)}` : `${m}:${deux(s)}`;
}

/**
 * L'heure a-t-elle reculé depuis la dernière vue, ou sauté pendant que
 * l'écran tournait ? `ecartMonotone` : le temps écoulé selon
 * `performance.now()` (insensible aux changements d'heure), quand l'écran
 * est resté ouvert ; `null` au retour d'une fermeture (le temps a pu
 * légitimement passer).
 */
export function controlerHorloge(
    examen: ExamenLocal,
    maintenant: number,
    ecartMonotone: number | null,
): string | null {
    if (maintenant < examen.derniere_heure - 60_000) {
        return 'L’heure du téléphone a reculé pendant l’examen.';
    }

    if (
        ecartMonotone !== null &&
        Math.abs(maintenant - examen.derniere_heure - ecartMonotone) >
            SAUT_MAX_MS
    ) {
        return 'L’heure du téléphone a sauté de plus de 5 minutes pendant l’examen.';
    }

    return null;
}

/** Note la dernière heure vue, et un saut d'horloge s'il y en a un. */
export function noterHeure(
    base: BaseHorsLigne,
    id: string,
    maintenant: number,
    ecartMonotone: number | null,
): Promise<ExamenLocal> {
    return modifier(base, id, (examen) => {
        const motif = controlerHorloge(examen, maintenant, ecartMonotone);

        return {
            derniere_heure: Math.max(maintenant, examen.derniere_heure),
            ...(motif && !examen.horloge_suspecte
                ? { horloge_suspecte: true, motif_horloge: motif }
                : {}),
        };
    });
}

/**
 * Fin du passage (« Terminer », ou temps écoulé — même application fermée :
 * l'heure de fin est alors celle de la fin du temps). Les réponses se
 * figent ; restent les rédactions à auto-évaluer.
 */
export function clore(
    base: BaseHorsLigne,
    id: string,
    maintenant: number,
): Promise<ExamenLocal> {
    return modifier(base, id, (examen) => {
        if (examen.statut !== 'en_cours') {
            return {};
        }

        const fin = finDuTemps(examen);

        return {
            statut: 'a_evaluer',
            termine_le: new Date(Math.min(maintenant, fin)).toISOString(),
            temps_ecoule: maintenant >= fin,
        };
    });
}

export function evaluer(
    base: BaseHorsLigne,
    id: string,
    question: string,
    criteres: string[],
): Promise<ExamenLocal> {
    return modifier(base, id, (examen) => {
        const donnee = examen.reponses[question];

        return donnee
            ? {
                  reponses: {
                      ...examen.reponses,
                      [question]: { ...donnee, criteres },
                  },
              }
            : {};
    });
}

/** Correction d'affichage : la note que l'élève voit tout de suite. */
export function noter(examen: ExamenLocal, sujet: SujetEleve): Note {
    return noteExamen(
        sujet.parties.map((partie) => ({
            bareme: partie.bareme,
            scores: partie.questions.map((question) => {
                const donnee = examen.reponses[question.uuid];

                if (!donnee?.reponse) {
                    return null;
                }

                if (question.type === 'ouverte') {
                    return donnee.criteres === null
                        ? null
                        : scoreAutoEvaluation(
                              question.donnees,
                              donnee.criteres,
                          );
                }

                return corriger(
                    question.type,
                    question.attendue,
                    donnee.reponse as Record<string, unknown>,
                );
            }),
        })),
    );
}

/**
 * Envoie l'examen par la file (priorité 0), puis le retire de la table.
 * Envoyé deux fois (coupure entre les deux écritures) : une seule opération,
 * l'identifiant étant celui de l'examen.
 */
export async function envoyer(
    base: BaseHorsLigne,
    enregistrer: (geste: NouveauGeste) => Promise<string>,
    examen: ExamenLocal,
    sujet: SujetEleve,
): Promise<{ note: number }> {
    const { note } = noter(examen, sujet);

    await enregistrer({
        uuid: examen.id,
        type: 'examen_blanc.terminer',
        priorite: 0,
        charge: {
            sujet: examen.sujet,
            version: examen.version,
            commence_le: examen.commence_le,
            termine_le: examen.termine_le ?? new Date().toISOString(),
            duree_minutes: examen.duree_minutes,
            origine_duree: examen.origine_duree,
            temps_ecoule: examen.temps_ecoule,
            note_appareil: note,
            horloge_suspecte: examen.horloge_suspecte,
            motif_horloge: examen.motif_horloge,
            // Pour « Mes examens blancs » tant que l'envoi attend (ignoré
            // par le serveur).
            affichage: {
                matiere: sujet.matiere,
                libelle_session: sujet.libelle_session,
                titre: sujet.titre,
            },
            // Toutes les questions passées, réponse ou non : le serveur
            // recorrige contre la version vue.
            reponses: Object.fromEntries(
                sujet.parties.flatMap((p) =>
                    p.questions.map((q) => [
                        q.uuid,
                        examen.reponses[q.uuid] ?? {
                            version: q.version,
                            reponse: null,
                            criteres: null,
                        },
                    ]),
                ),
            ),
        },
    });

    await table(base).delete(examen.id);

    return { note };
}
