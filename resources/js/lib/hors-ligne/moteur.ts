import type {
    Acquittee,
    Anomalie,
    BaseHorsLigne,
    Operation,
} from '@/lib/hors-ligne/base';
import { uuid7 as uuid7Navigateur } from '@/lib/hors-ligne/uuid7';

/**
 * Le moteur de la file d'opérations (HORS_LIGNE.md A.3.5).
 *
 * - un seul envoi à la fois ; lots de 50 au plus, ordonnés par
 *   `[priorite, uuid]` ; un geste dont `depend_de` n'est pas acquitté attend ;
 * - échec réseau ou 5xx : délai croissant 2 s, 4 s, 8 s… plafonné à 5 min ;
 * - 419 : `GET /sync/etat` pour un jeton CSRF neuf, puis renvoi ;
 * - 401 : pause sans rien perdre (« session expirée »), reprise à la
 *   reconnexion ;
 * - 8 échecs techniques sur un même geste : il passe en anomalie
 *   (réessayable) ;
 * - « hors ligne » est décidé par l'échec d'une requête, jamais par
 *   `navigator.onLine` seul.
 *
 * Tout est injecté (base, transport, horloge, minuterie) : les tests le font
 * tourner sans réseau ni navigateur.
 */

export type Reseau = 'en_ligne' | 'hors_ligne' | 'session_expiree';

export type EtatHorsLigne = {
    reseau: Reseau;
    enAttente: number;
    anomalies: number;
};

export type RequeteTransport = {
    methode: 'GET' | 'POST';
    url: string;
    corps?: unknown;
    entetes?: Record<string, string>;
};

export type ReponseTransport = { statut: number; corps: unknown };

/** Rejette sur un échec réseau ; rend le statut HTTP sinon. */
export type Transport = (
    requete: RequeteTransport,
) => Promise<ReponseTransport>;

export type Planifier = (rappel: () => void, delaiMs: number) => () => void;

export type NouveauGeste = {
    type: string;
    charge: Record<string, unknown>;
    priorite?: number;
    depend_de?: string | null;
};

type Verdict = {
    uuid: string;
    verdict: 'acceptee' | 'deja_recue' | 'rejetee' | 'reporte' | 'erreur';
    origine?: string;
    resultat?: Record<string, unknown> | null;
    motif?: string;
};

type Evenements = {
    etat: (etat: EtatHorsLigne) => void;
    acquittee: (uuid: string, resultat: Record<string, unknown> | null) => void;
    rejetee: (uuid: string, motif: string) => void;
};

export const TAILLE_LOT = 50;
export const ESSAIS_MAX = 8;
export const DELAI_INITIAL_MS = 2_000;
export const DELAI_MAX_MS = 5 * 60_000;
export const CADENCE_MS = 30_000;
export const PRIORITE_PAR_DEFAUT = 5;
const DUREE_ACQUITTEES_MS = 7 * 24 * 3600_000;

export const URL_ETAT = '/sync/etat';
export const URL_OPERATIONS = '/sync/operations';

export class MoteurHorsLigne {
    private etatCourant: EtatHorsLigne = {
        reseau: 'en_ligne',
        enAttente: 0,
        anomalies: 0,
    };

    private auditeurs: { [K in keyof Evenements]: Set<Evenements[K]> } = {
        etat: new Set(),
        acquittee: new Set(),
        rejetee: new Set(),
    };

    private utilisateurId: number | null = null;
    private csrf: string | null = null;
    private envoiEnCours: Promise<void> | null = null;
    private relancer = false;
    private echecsSuccessifs = 0;
    private annulerMinuterie: (() => void) | null = null;
    /** Gestes reportés pendant ce passage : pas renvoyés en boucle. */
    private reportes = new Set<string>();

    private readonly base: BaseHorsLigne;
    private readonly transport: Transport;
    private readonly maintenant: () => number;
    private readonly planifier: Planifier;
    private readonly uuid7: () => string;

    constructor(options: {
        base: BaseHorsLigne;
        transport: Transport;
        maintenant?: () => number;
        planifier?: Planifier;
        uuid7?: () => string;
    }) {
        this.base = options.base;
        this.transport = options.transport;
        this.maintenant = options.maintenant ?? (() => Date.now());
        this.planifier =
            options.planifier ??
            ((rappel, delaiMs) => {
                const minuterie = setTimeout(rappel, delaiMs);

                return () => clearTimeout(minuterie);
            });
        this.uuid7 = options.uuid7 ?? uuid7Navigateur;
    }

    /* ---------- État et abonnements ---------- */

    get etat(): EtatHorsLigne {
        return this.etatCourant;
    }

    get utilisateur(): number | null {
        return this.utilisateurId;
    }

    on<K extends keyof Evenements>(
        evenement: K,
        rappel: Evenements[K],
    ): () => void {
        this.auditeurs[evenement].add(rappel);

        return () => this.auditeurs[evenement].delete(rappel);
    }

    private changerEtat(changement: Partial<EtatHorsLigne>): void {
        const suivant = { ...this.etatCourant, ...changement };

        if (
            suivant.reseau === this.etatCourant.reseau &&
            suivant.enAttente === this.etatCourant.enAttente &&
            suivant.anomalies === this.etatCourant.anomalies
        ) {
            return;
        }

        this.etatCourant = suivant;
        this.auditeurs.etat.forEach((rappel) => rappel(suivant));
    }

    /** Un échec réseau vu ailleurs (navigation) : hors ligne aussitôt. */
    signalerHorsLigne(): void {
        if (this.etatCourant.reseau === 'en_ligne') {
            this.changerEtat({ reseau: 'hors_ligne' });
        }
    }

    /** Une réponse du serveur vue ailleurs (navigation réussie) : en ligne. */
    signalerEnLigne(): void {
        if (this.etatCourant.reseau === 'hors_ligne') {
            this.changerEtat({ reseau: 'en_ligne' });
            this.reveiller();
        }
    }

    /**
     * Profil actif (page chargée, connexion, déconnexion). Une reconnexion
     * lève la pause « session expirée » et relance l'envoi.
     */
    async definirUtilisateur(id: number | null): Promise<void> {
        const change = id !== this.utilisateurId;
        this.utilisateurId = id;

        if (id !== null && this.etatCourant.reseau === 'session_expiree') {
            this.changerEtat({ reseau: 'en_ligne' });
        }

        if (change) {
            await this.compter();

            // Premier contact du profil : enregistre l'appareil et lui
            // rattache le profil (A.7), mesure l'horloge, prend un jeton CSRF.
            if (id !== null) {
                await this.rafraichirEtat();
            }

            this.reveiller();
        }
    }

    /* ---------- Point d'entrée unique des gestes ---------- */

    /**
     * Écrit le geste dans la base **avant** toute tentative d'envoi, puis
     * réveille le moteur. En ligne comme hors ligne : pas de second chemin.
     */
    async enregistrer(geste: NouveauGeste): Promise<string> {
        if (this.utilisateurId === null) {
            throw new Error('Aucun profil actif : geste non enregistré.');
        }

        const operation: Operation = {
            uuid: this.uuid7(),
            type: geste.type,
            charge: geste.charge,
            auteur_id: this.utilisateurId,
            saisi_le: new Date(this.maintenant()).toISOString(),
            priorite: geste.priorite ?? PRIORITE_PAR_DEFAUT,
            depend_de: geste.depend_de ?? null,
            essais: 0,
            statut: 'en_attente',
            derniere_erreur: null,
        };

        await this.base.operations.add(operation);
        await this.compter();
        this.reveiller();

        return operation.uuid;
    }

    /**
     * Comme `enregistrer`, pour un écran en ligne qui veut afficher un refus
     * sur place : attend le verdict au plus `delaiMs`, sinon « en_attente »
     * (le geste reste gardé et partira).
     */
    async enregistrerEtAttendre(
        geste: NouveauGeste,
        delaiMs: number,
    ): Promise<
        | { verdict: 'acceptee'; resultat: Record<string, unknown> | null }
        | { verdict: 'rejetee'; motif: string }
        | { verdict: 'en_attente' }
    > {
        let uuid = '';

        return new Promise((resoudre) => {
            const fins: (() => void)[] = [];
            const conclure = (verdict: Parameters<typeof resoudre>[0]) => {
                fins.forEach((fin) => fin());
                resoudre(verdict);
            };

            fins.push(
                this.on('acquittee', (cle, resultat) => {
                    if (cle === uuid) {
                        conclure({ verdict: 'acceptee', resultat });
                    }
                }),
                this.on('rejetee', (cle, motif) => {
                    if (cle === uuid) {
                        conclure({ verdict: 'rejetee', motif });
                    }
                }),
                this.planifier(
                    () => conclure({ verdict: 'en_attente' }),
                    delaiMs,
                ),
            );

            void this.enregistrer(geste).then((cle) => {
                uuid = cle;
            });
        });
    }

    /* ---------- Listes « À envoyer » et « À corriger » ---------- */

    async aEnvoyer(): Promise<Operation[]> {
        if (this.utilisateurId === null) {
            return [];
        }

        return (
            await this.base.operations.orderBy('[priorite+uuid]').toArray()
        ).filter((operation) => operation.auteur_id === this.utilisateurId);
    }

    async aCorriger(): Promise<Anomalie[]> {
        if (this.utilisateurId === null) {
            return [];
        }

        return this.base.anomalies
            .where('auteur_id')
            .equals(this.utilisateurId)
            .sortBy('uuid');
    }

    async abandonner(uuid: string): Promise<void> {
        await this.base.anomalies.delete(uuid);
        await this.compter();
    }

    async reessayer(uuid: string): Promise<void> {
        await this.base.transaction(
            'rw',
            this.base.anomalies,
            this.base.operations,
            async () => {
                const anomalie = await this.base.anomalies.get(uuid);

                if (!anomalie) {
                    return;
                }

                const {
                    genre: _genre,
                    motif: _motif,
                    survenue_le: _survenue,
                    ...operation
                } = anomalie;
                await this.base.operations.put({
                    ...operation,
                    essais: 0,
                    statut: 'en_attente',
                    derniere_erreur: null,
                });
                await this.base.anomalies.delete(uuid);
            },
        );
        await this.compter();
        this.reveiller();
    }

    private async compter(): Promise<void> {
        const id = this.utilisateurId;

        if (id === null) {
            this.changerEtat({ enAttente: 0, anomalies: 0 });

            return;
        }

        const [enAttente, anomalies] = await Promise.all([
            this.base.operations.where('auteur_id').equals(id).count(),
            this.base.anomalies.where('auteur_id').equals(id).count(),
        ]);
        this.changerEtat({ enAttente, anomalies });
    }

    /* ---------- Envoi ---------- */

    /** Déclencheurs : un geste, `online`, retour au premier plan, minuterie. */
    reveiller(): void {
        this.annulerMinuterie?.();
        this.annulerMinuterie = null;
        void this.vider();
    }

    /** Envoie tout ce qui peut l'être ; un seul envoi à la fois. */
    vider(): Promise<void> {
        if (this.envoiEnCours) {
            this.relancer = true;

            return this.envoiEnCours;
        }

        this.reportes.clear();
        this.envoiEnCours = (async () => {
            try {
                // Une relance demandée pendant l'envoi est jouée, sauf si cet
                // envoi a échoué : la reprise planifiée s'en charge, sans
                // accélérer le délai croissant.
                do {
                    this.relancer = false;
                    await this.cycle();
                } while (this.relancer && this.annulerMinuterie === null);
            } finally {
                this.envoiEnCours = null;
                await this.compter();
                this.planifierCadence();
            }
        })();

        return this.envoiEnCours;
    }

    private async cycle(): Promise<void> {
        for (;;) {
            if (
                this.utilisateurId === null ||
                this.etatCourant.reseau === 'session_expiree'
            ) {
                return;
            }

            const lot = await this.prochainLot();

            if (lot.length === 0) {
                return;
            }

            if ((await this.envoyerLot(lot, false)) === 'arreter') {
                return;
            }
        }
    }

    private async prochainLot(): Promise<Operation[]> {
        const candidates = (await this.aEnvoyer()).filter(
            (operation) => !this.reportes.has(operation.uuid),
        );
        const dependances = candidates
            .map((operation) => operation.depend_de)
            .filter((uuid): uuid is string => uuid !== null);
        const acquittees = new Set(
            (await this.base.acquittees.bulkGet(dependances))
                .filter((ligne): ligne is Acquittee => ligne !== undefined)
                .map((ligne) => ligne.uuid),
        );
        const lot: Operation[] = [];
        const dansLeLot = new Set<string>();

        for (const operation of candidates) {
            if (lot.length >= TAILLE_LOT) {
                break;
            }

            if (
                operation.depend_de === null ||
                acquittees.has(operation.depend_de) ||
                dansLeLot.has(operation.depend_de)
            ) {
                lot.push(operation);
                dansLeLot.add(operation.uuid);
            }
        }

        return lot;
    }

    private async envoyerLot(
        lot: Operation[],
        apresNouveauJeton: boolean,
    ): Promise<'continuer' | 'arreter'> {
        const appareil = await this.jetonAppareil();

        // Pas de jeton faute de réseau : on réessaiera, comme pour un lot.
        if (appareil === null) {
            if (this.etatCourant.reseau !== 'session_expiree') {
                this.planifierReprise();
            }

            return 'arreter';
        }

        const horloge = await this.base.lireMeta<{
            decalage_ms: number;
            mesure_le: string;
        }>('horloge');
        const envoyeLe = this.maintenant();
        let reponse: ReponseTransport;

        try {
            reponse = await this.transport({
                methode: 'POST',
                url: URL_OPERATIONS,
                entetes: this.csrf ? { 'X-CSRF-TOKEN': this.csrf } : {},
                corps: {
                    appareil,
                    decalage_horloge_ms: horloge?.decalage_ms ?? null,
                    mesure_le: horloge?.mesure_le ?? null,
                    envoye_le: new Date(envoyeLe).toISOString(),
                    operations: lot.map((operation) => ({
                        uuid: operation.uuid,
                        type: operation.type,
                        auteur_id: operation.auteur_id,
                        saisi_le: operation.saisi_le,
                        depend_de: operation.depend_de,
                        charge: operation.charge,
                    })),
                },
            });
        } catch {
            this.signalerHorsLigne();
            this.planifierReprise();

            return 'arreter';
        }

        switch (reponse.statut) {
            case 200: {
                const corps = reponse.corps as {
                    heure_serveur: string;
                    resultats: Verdict[];
                };
                await this.mesurerHorloge(corps.heure_serveur, envoyeLe);
                this.changerEtat({ reseau: 'en_ligne' });

                return this.traiterVerdicts(lot, corps.resultats);
            }
            case 401:
                this.changerEtat({ reseau: 'session_expiree' });

                return 'arreter';
            case 419:
                if (!apresNouveauJeton && (await this.rafraichirEtat())) {
                    return this.envoyerLot(lot, true);
                }

                return this.echecTechnique(lot, 'Jeton de sécurité refusé.');
            case 409:
                // Appareil inconnu ou révoqué : un nouveau jeton, puis renvoi.
                await this.base.ecrireMeta('appareil', null);

                if (!apresNouveauJeton && (await this.rafraichirEtat())) {
                    return this.envoyerLot(lot, true);
                }

                return this.echecTechnique(lot, 'Appareil non reconnu.');
            default:
                return this.echecTechnique(
                    lot,
                    `Le serveur a répondu ${reponse.statut}.`,
                );
        }
    }

    private async traiterVerdicts(
        lot: Operation[],
        verdicts: Verdict[],
    ): Promise<'continuer' | 'arreter'> {
        const parUuid = new Map(
            lot.map((operation) => [operation.uuid, operation]),
        );
        let erreur = false;

        for (const verdict of verdicts) {
            const operation = parUuid.get(verdict.uuid);

            if (!operation) {
                continue;
            }

            const refus =
                verdict.verdict === 'rejetee' ||
                (verdict.verdict === 'deja_recue' &&
                    verdict.origine === 'rejetee');

            if (refus) {
                await this.versAnomalie(
                    operation,
                    'rejetee',
                    verdict.motif ?? 'Refusé par le serveur.',
                );
                this.auditeurs.rejetee.forEach((rappel) =>
                    rappel(operation.uuid, verdict.motif ?? ''),
                );
            } else if (
                verdict.verdict === 'acceptee' ||
                verdict.verdict === 'deja_recue'
            ) {
                await this.acquitter(operation, verdict.resultat ?? null);
            } else if (verdict.verdict === 'reporte') {
                this.reportes.add(operation.uuid);
                await this.base.operations.update(operation.uuid, {
                    statut: 'reporte',
                    derniere_erreur: verdict.motif ?? null,
                });
            } else {
                erreur = true;
                await this.compterEchec(
                    operation,
                    verdict.motif ?? 'Erreur du serveur.',
                );
            }
        }

        this.echecsSuccessifs = erreur ? this.echecsSuccessifs : 0;

        if (erreur) {
            this.planifierReprise();

            return 'arreter';
        }

        return 'continuer';
    }

    private async acquitter(
        operation: Operation,
        resultat: Record<string, unknown> | null,
    ): Promise<void> {
        const limite = new Date(
            this.maintenant() - DUREE_ACQUITTEES_MS,
        ).toISOString();

        await this.base.transaction(
            'rw',
            this.base.operations,
            this.base.acquittees,
            async () => {
                await this.base.operations.delete(operation.uuid);
                await this.base.acquittees.put({
                    uuid: operation.uuid,
                    type: operation.type,
                    auteur_id: operation.auteur_id,
                    resultat,
                    acquittee_le: new Date(this.maintenant()).toISOString(),
                });
                await this.base.acquittees
                    .where('acquittee_le')
                    .below(limite)
                    .delete();
            },
        );
        this.auditeurs.acquittee.forEach((rappel) =>
            rappel(operation.uuid, resultat),
        );
    }

    private async versAnomalie(
        operation: Operation,
        genre: Anomalie['genre'],
        motif: string,
    ): Promise<void> {
        await this.base.transaction(
            'rw',
            this.base.operations,
            this.base.anomalies,
            async () => {
                await this.base.operations.delete(operation.uuid);
                await this.base.anomalies.put({
                    ...operation,
                    genre,
                    motif,
                    survenue_le: new Date(this.maintenant()).toISOString(),
                });
            },
        );
    }

    private async compterEchec(
        operation: Operation,
        motif: string,
    ): Promise<void> {
        const essais = operation.essais + 1;

        if (essais >= ESSAIS_MAX) {
            await this.versAnomalie(
                { ...operation, essais },
                'erreur',
                'Envoi impossible après plusieurs essais.',
            );

            return;
        }

        await this.base.operations.update(operation.uuid, {
            essais,
            statut: 'en_attente',
            derniere_erreur: motif,
        });
    }

    private async echecTechnique(
        lot: Operation[],
        motif: string,
    ): Promise<'arreter'> {
        for (const operation of lot) {
            await this.compterEchec(operation, motif);
        }

        this.planifierReprise();

        return 'arreter';
    }

    /* ---------- État du serveur, appareil, horloge ---------- */

    /**
     * `GET /sync/etat` : battement de connectivité, jeton CSRF neuf,
     * enregistrement de l'appareil, mesure de l'horloge. Rend vrai si le
     * serveur a répondu normalement.
     */
    async rafraichirEtat(): Promise<boolean> {
        const appareil = await this.base.lireMeta<string | null>('appareil');
        const envoyeLe = this.maintenant();
        let reponse: ReponseTransport;

        try {
            reponse = await this.transport({
                methode: 'GET',
                url: URL_ETAT,
                entetes: appareil ? { 'X-Appareil': appareil } : {},
            });
        } catch {
            this.signalerHorsLigne();

            return false;
        }

        if (reponse.statut === 401) {
            this.changerEtat({ reseau: 'session_expiree' });

            return false;
        }

        if (reponse.statut !== 200) {
            return false;
        }

        const corps = reponse.corps as {
            heure_serveur: string;
            csrf: string;
            appareil?: string;
        };
        this.csrf = corps.csrf;

        if (corps.appareil) {
            await this.base.ecrireMeta('appareil', corps.appareil);
        }

        await this.mesurerHorloge(corps.heure_serveur, envoyeLe);
        const revient = this.etatCourant.reseau !== 'en_ligne';
        this.changerEtat({ reseau: 'en_ligne' });

        if (revient && this.etatCourant.enAttente > 0) {
            this.reveiller();
        }

        return true;
    }

    private async jetonAppareil(): Promise<string | null> {
        const connu = await this.base.lireMeta<string | null>('appareil');

        if (connu) {
            return connu;
        }

        await this.rafraichirEtat();

        return (await this.base.lireMeta<string | null>('appareil')) ?? null;
    }

    /**
     * Décalage = heure du serveur − heure de l'appareil, prise au milieu de
     * l'aller-retour ; gardé avec l'heure (appareil) de sa mesure.
     */
    private async mesurerHorloge(
        heureServeur: string,
        envoyeLe: number,
    ): Promise<void> {
        const recuLe = this.maintenant();
        const serveur = Date.parse(heureServeur);

        if (Number.isNaN(serveur)) {
            return;
        }

        await this.base.ecrireMeta('horloge', {
            decalage_ms: Math.round(serveur - (envoyeLe + recuLe) / 2),
            mesure_le: new Date(recuLe).toISOString(),
        });
    }

    /* ---------- Minuteries ---------- */

    private planifierReprise(): void {
        this.echecsSuccessifs += 1;
        const delai = Math.min(
            DELAI_INITIAL_MS * 2 ** (this.echecsSuccessifs - 1),
            DELAI_MAX_MS,
        );
        this.annulerMinuterie?.();
        this.annulerMinuterie = this.planifier(() => {
            this.annulerMinuterie = null;
            void this.vider();
        }, delai);
    }

    /** Toutes les 30 s tant que la file n'est pas vide. */
    private planifierCadence(): void {
        if (
            this.annulerMinuterie !== null ||
            this.etatCourant.enAttente === 0 ||
            this.etatCourant.reseau === 'session_expiree'
        ) {
            return;
        }

        this.annulerMinuterie = this.planifier(() => {
            this.annulerMinuterie = null;
            void this.vider();
        }, CADENCE_MS);
    }
}
