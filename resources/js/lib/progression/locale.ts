import type { BaseHorsLigne, Operation } from '@/lib/hors-ligne/base';
import { cleContenu } from '@/lib/contenu/source';
import type { CleMatiere } from '@/lib/matieres';

/**
 * La progression sur l'appareil (HL4, HORS_LIGNE.md A.10). **Rien n'est
 * calculé ici** : maîtrise, jauge et choix des séances sont l'affaire du
 * serveur (MaitriseService, SeanceService). L'appareil garde :
 *
 *  - la **dernière jauge du serveur**, et compte les réponses pas encore
 *    reçues (« 12 réponses pas encore comptées », HL-D7) ;
 *  - les **trois prochaines séances**, avec les props mêmes de leur écran
 *    (table `contenus`, clé `seance:<uuid>`, comme un pack, A.4) : hors
 *    ligne, « Commencer » ouvre la suivante ;
 *  - la **trace** : un jour où l'élève a répondu sur ce téléphone compte
 *    tout de suite, en attendant la confirmation du serveur.
 *
 * Ce fichier n'importe ni React ni Inertia, pour rester testable.
 */

export type Jauge = {
    pourcentage: number;
    matieres: { cle: CleMatiere; maitrise: number }[];
    calcule_le: string;
};

export type EtatCase =
    | 'objectif'
    | 'commence'
    | 'grace'
    | 'aujourdhui'
    | 'manque'
    | 'a_venir';

export type Serie = {
    jours: number;
    rompue: boolean;
    aujourdhui_fait: boolean;
    reponses_semaine: number;
    cases: { date: string; jour: string; etat: EtatCase }[];
    calcule_le: string;
};

/** Réponse de `GET /eleve/instantane` (TableauDeBordEleveService::instantane). */
export type Instantane = {
    calcule_le: string;
    jauge: Jauge;
    serie: Serie;
    seances: { uuid: string; rang: number; props: Record<string, unknown> }[];
};

/** Ce que la table `progression` garde pour un profil. */
export type ProgressionLocale = {
    auteur_id: number;
    jauge: Jauge;
    serie: Serie;
    recu_le: string;
};

/** Une séance préparée gardée sur l'appareil (table `seances`). */
export type SeanceLocale = {
    id: string;
    auteur_id: number;
    rang: number;
    terminee: boolean;
};

export const URL_INSTANTANE = '/eleve/instantane';
const PACK_SEANCES = 'seances';

/** La plus récente des deux jauges du serveur : celle de la page, ou celle gardée. */
export function jaugeLaPlusRecente(page: Jauge, gardee: Jauge | null): Jauge {
    if (gardee === null) {
        return page;
    }

    return Date.parse(gardee.calcule_le) > Date.parse(page.calcule_le ?? '')
        ? gardee
        : page;
}

/** Réponses de ce profil encore dans la file : pas encore comptées par le serveur. */
export function reponsesNonComptees(
    operations: Pick<Operation, 'type' | 'auteur_id'>[],
    auteurId: number,
): number {
    return operations.filter(
        (operation) =>
            operation.auteur_id === auteurId &&
            operation.type === 'tentative.enregistrer',
    ).length;
}

/** Date locale `AAAA-MM-JJ` d'un instant. */
export function jourLocal(instant: Date): string {
    const mois = String(instant.getMonth() + 1).padStart(2, '0');
    const jour = String(instant.getDate()).padStart(2, '0');

    return `${instant.getFullYear()}-${mois}-${jour}`;
}

/**
 * La trace du serveur, complétée des jours où l'élève a répondu sur ce
 * téléphone sans que le serveur le sache encore. Un jour ainsi ajouté vaut
 * « commencé » (l'objectif, lui, est décidé par le serveur) ; aujourd'hui
 * ajouté prolonge la série d'un jour. `provisoire` : à confirmer.
 */
export function traceAvecLocal(
    serie: Serie,
    joursLocaux: string[],
    aujourdhui: string,
): Serie & { provisoire: boolean } {
    const locaux = new Set(joursLocaux);
    let provisoire = false;

    const cases = serie.cases.map((uneCase) => {
        if (
            locaux.has(uneCase.date) &&
            ['aujourdhui', 'manque', 'grace'].includes(uneCase.etat)
        ) {
            provisoire = true;

            return { ...uneCase, etat: 'commence' as const };
        }

        return uneCase;
    });

    const aujourdhuiAjoute = locaux.has(aujourdhui) && !serie.aujourdhui_fait;

    return {
        ...serie,
        cases,
        jours: aujourdhuiAjoute ? serie.jours + 1 : serie.jours,
        rompue: aujourdhuiAjoute ? false : serie.rompue,
        aujourdhui_fait: serie.aujourdhui_fait || aujourdhuiAjoute,
        provisoire,
    };
}

/** Les jours (locaux) des réponses de ce profil encore dans la file. */
export function joursDesReponses(
    operations: Pick<Operation, 'type' | 'auteur_id' | 'saisi_le'>[],
    auteurId: number,
): string[] {
    return [
        ...new Set(
            operations
                .filter(
                    (operation) =>
                        operation.auteur_id === auteurId &&
                        operation.type === 'tentative.enregistrer',
                )
                .map((operation) => jourLocal(new Date(operation.saisi_le))),
        ),
    ];
}

/**
 * Range l'instantané du serveur : jauge et série du profil, ses trois
 * séances préparées. Une séance qui n'est plus proposée est oubliée, sauf
 * si une réponse en file la cite encore (elle doit pouvoir se rouvrir).
 */
export async function rangerInstantane(
    base: Pick<
        BaseHorsLigne,
        'progression' | 'seances' | 'contenus' | 'operations' | 'transaction'
    >,
    auteurId: number,
    instantane: Instantane,
    maintenant: Date = new Date(),
): Promise<void> {
    const operations = await base.operations
        .where('auteur_id')
        .equals(auteurId)
        .toArray();
    const citees = new Set(
        operations
            .map((operation) => operation.charge.seance)
            .filter((uuid): uuid is string => typeof uuid === 'string'),
    );
    const nouvelles = new Set(instantane.seances.map((seance) => seance.uuid));
    const anciennes = (await base.seances
        .where('auteur_id')
        .equals(auteurId)
        .toArray()) as SeanceLocale[];

    await base.transaction(
        'rw',
        [base.progression, base.seances, base.contenus],
        async () => {
            await base.progression.put({
                auteur_id: auteurId,
                jauge: instantane.jauge,
                serie: instantane.serie,
                recu_le: maintenant.toISOString(),
            } satisfies ProgressionLocale);

            for (const ancienne of anciennes) {
                if (!nouvelles.has(ancienne.id) && !citees.has(ancienne.id)) {
                    await base.seances.delete(ancienne.id);
                    await base.contenus.delete(
                        cleContenu('seance', ancienne.id),
                    );
                }
            }

            for (const seance of instantane.seances) {
                const deja = anciennes.find((a) => a.id === seance.uuid);
                await base.seances.put({
                    id: seance.uuid,
                    auteur_id: auteurId,
                    rang: seance.rang,
                    terminee: deja?.terminee ?? false,
                } satisfies SeanceLocale);
                await base.contenus.put({
                    cle: cleContenu('seance', seance.uuid),
                    pack: PACK_SEANCES,
                    props: seance.props,
                });
            }
        },
    );
}

/** La prochaine séance préparée à faire sur ce téléphone, ou `null`. */
export async function prochaineSeanceLocale(
    base: Pick<BaseHorsLigne, 'seances'>,
    auteurId: number,
): Promise<string | null> {
    try {
        const seances = (await base.seances
            .where('auteur_id')
            .equals(auteurId)
            .toArray()) as SeanceLocale[];
        const suivante = seances
            .filter((seance) => !seance.terminee)
            .sort((a, b) => a.rang - b.rang)[0];

        return suivante?.id ?? null;
    } catch {
        return null;
    }
}

/** Une séance terminée sur ce téléphone ne se propose plus hors ligne. */
export async function marquerSeanceTerminee(
    base: Pick<BaseHorsLigne, 'seances'>,
    uuid: string,
): Promise<void> {
    try {
        await base.seances.update(uuid, { terminee: true });
    } catch {
        // Base indisponible : rien à marquer.
    }
}

/** La progression gardée pour ce profil, ou `null`. */
export async function lireProgressionLocale(
    base: Pick<BaseHorsLigne, 'progression'>,
    auteurId: number,
): Promise<ProgressionLocale | null> {
    try {
        return ((await base.progression.get(auteurId)) ??
            null) as ProgressionLocale | null;
    } catch {
        return null;
    }
}
