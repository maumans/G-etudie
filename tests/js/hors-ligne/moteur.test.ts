import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BaseHorsLigne } from '@/lib/hors-ligne/base';
import {
    DELAI_INITIAL_MS,
    ESSAIS_MAX,
    MoteurHorsLigne,
    URL_ETAT,
    URL_OPERATIONS,
} from '@/lib/hors-ligne/moteur';
import type {
    RequeteTransport,
    ReponseTransport,
} from '@/lib/hors-ligne/moteur';
import { creerGenerateurUuid7 } from '@/lib/hors-ligne/uuid7';

type Envoi = {
    uuid: string;
    type: string;
    auteur_id: number;
    depend_de: string | null;
};

/**
 * Faux serveur : répond à `GET /sync/etat`, et à chaque lot selon `verdict`
 * (acceptée par défaut). `panne` : échec réseau.
 */
function fauxServeur() {
    const serveur = {
        requetes: [] as RequeteTransport[],
        lots: [] as Envoi[][],
        panne: false,
        statutLot: 200 as number | (() => number),
        verdict: (_envoi: Envoi): Record<string, unknown> => ({
            verdict: 'acceptee',
            resultat: { ok: true },
        }),
        async transport(requete: RequeteTransport): Promise<ReponseTransport> {
            serveur.requetes.push(requete);

            if (serveur.panne) {
                throw new TypeError('Failed to fetch');
            }

            if (requete.url === URL_ETAT) {
                return {
                    statut: 200,
                    corps: {
                        heure_serveur: new Date().toISOString(),
                        csrf: `jeton-${serveur.requetes.length}`,
                        appareil: requete.entetes?.['X-Appareil']
                            ? undefined
                            : 'jeton-appareil',
                    },
                };
            }

            const statut =
                typeof serveur.statutLot === 'function'
                    ? serveur.statutLot()
                    : serveur.statutLot;

            if (statut !== 200) {
                return { statut, corps: null };
            }

            const operations = (requete.corps as { operations: Envoi[] })
                .operations;
            serveur.lots.push(operations);

            return {
                statut: 200,
                corps: {
                    heure_serveur: new Date().toISOString(),
                    resultats: operations.map((operation) => ({
                        uuid: operation.uuid,
                        ...serveur.verdict(operation),
                    })),
                },
            };
        },
    };

    return serveur;
}

/** Minuterie manuelle : on voit les délais demandés, on les déclenche à la main. */
function minuterieManuelle() {
    const attentes: { delai: number; rappel: () => void; annulee: boolean }[] =
        [];

    return {
        attentes,
        planifier(rappel: () => void, delai: number) {
            const attente = { delai, rappel, annulee: false };
            attentes.push(attente);

            return () => {
                attente.annulee = true;
            };
        },
        actives: () => attentes.filter((attente) => !attente.annulee),
    };
}

let nomBase = '';
let base: BaseHorsLigne;

function creerMoteur(
    serveur = fauxServeur(),
    minuterie = minuterieManuelle(),
    baseUtilisee = base,
) {
    const moteur = new MoteurHorsLigne({
        base: baseUtilisee,
        transport: (requete) => serveur.transport(requete),
        planifier: (rappel, delai) => minuterie.planifier(rappel, delai),
    });

    return { moteur, serveur, minuterie };
}

beforeEach(() => {
    nomBase = `test-${Math.random()}`;
    base = new BaseHorsLigne(nomBase);
});

afterEach(async () => {
    base.close();
    await BaseHorsLigne.delete(nomBase);
});

describe('la file d’opérations', () => {
    it('garde un geste fait hors ligne, même après un redémarrage (n° 13)', async () => {
        const serveur = fauxServeur();
        serveur.panne = true;
        const { moteur } = creerMoteur(serveur);
        await moteur.definirUtilisateur(7);

        const uuid = await moteur.enregistrer({
            type: 'test.noter',
            charge: { valeur: 12 },
        });
        await moteur.vider();
        expect(moteur.etat).toMatchObject({
            reseau: 'hors_ligne',
            enAttente: 1,
        });

        // Téléphone redémarré : nouvelle base ouverte, nouveau moteur.
        await moteur.vider();
        base.close();
        const rouverte = new BaseHorsLigne(nomBase);
        const { moteur: apres } = creerMoteur(
            fauxServeur(),
            minuterieManuelle(),
            rouverte,
        );
        await apres.definirUtilisateur(7);
        await apres.vider();

        expect(await rouverte.operations.count()).toBe(0);
        expect(await rouverte.acquittees.get(uuid)).toMatchObject({
            uuid,
            auteur_id: 7,
        });
        rouverte.close();
        base = new BaseHorsLigne(nomBase);
    });

    it('écrit le geste avant toute tentative d’envoi', async () => {
        const { moteur, serveur } = creerMoteur();
        await moteur.definirUtilisateur(7);
        serveur.panne = true;

        await moteur.enregistrer({ type: 'test.noter', charge: {} });

        expect(await base.operations.count()).toBe(1);
        await moteur.vider();
    });

    it('un geste qui porte son uuid (examen blanc) ne s’enregistre qu’une fois', async () => {
        const { moteur, serveur } = creerMoteur();
        await moteur.definirUtilisateur(7);
        serveur.panne = true;
        const uuid = '0192f3a4-5b6c-7d8e-9f01-23456789abcd';

        const premier = await moteur.enregistrer({
            type: 'test.noter',
            charge: {},
            uuid,
        });
        const second = await moteur.enregistrer({
            type: 'test.noter',
            charge: {},
            uuid,
        });

        expect([premier, second]).toEqual([uuid, uuid]);
        expect(await base.operations.count()).toBe(1);
        await moteur.vider();
    });

    it('envoie dans l’ordre [priorité, uuid] et attend la dépendance (n° 14)', async () => {
        const { moteur, serveur } = creerMoteur();
        serveur.panne = true;
        await moteur.definirUtilisateur(7);

        const lecon = await moteur.enregistrer({
            type: 'lecon',
            charge: {},
            priorite: 3,
        });
        const premiere = await moteur.enregistrer({
            type: 'tentative',
            charge: {},
            priorite: 1,
        });
        const examen = await moteur.enregistrer({
            type: 'examen',
            charge: {},
            priorite: 0,
        });
        // L'auto-évaluation dépend d'une tentative faite après elle dans la
        // file, de priorité plus basse : elle attend son acquittement.
        const tentative = await moteur.enregistrer({
            type: 'tentative',
            charge: {},
            priorite: 9,
        });
        const autoEval = await moteur.enregistrer({
            type: 'auto_eval',
            charge: {},
            priorite: 1,
            depend_de: tentative,
        });

        serveur.panne = false;
        await moteur.vider();

        expect(
            serveur.lots.map((lot) => lot.map((envoi) => envoi.uuid)),
        ).toEqual([[examen, premiere, lecon, tentative], [autoEval]]);
        expect(moteur.etat.enAttente).toBe(0);
    });

    it('n’envoie que les gestes du profil connecté', async () => {
        const { moteur, serveur } = creerMoteur();
        serveur.panne = true;
        await moteur.definirUtilisateur(7);
        await moteur.enregistrer({ type: 'aine', charge: {} });
        await moteur.definirUtilisateur(8);
        await moteur.enregistrer({ type: 'cadet', charge: {} });

        serveur.panne = false;
        await moteur.vider();

        expect(serveur.lots.flat().map((envoi) => envoi.type)).toEqual([
            'cadet',
        ]);
        expect(await base.operations.count()).toBe(1);
    });

    it('401 : pause sans rien perdre, reprise à la reconnexion (n° 15)', async () => {
        const { moteur, serveur } = creerMoteur();
        await moteur.definirUtilisateur(7);
        serveur.statutLot = 401;

        await moteur.enregistrer({ type: 'test.noter', charge: {} });
        await moteur.vider();

        expect(moteur.etat).toMatchObject({
            reseau: 'session_expiree',
            enAttente: 1,
        });

        serveur.statutLot = 200;
        await moteur.definirUtilisateur(null);
        await moteur.definirUtilisateur(7);
        await moteur.vider();

        expect(moteur.etat).toMatchObject({ reseau: 'en_ligne', enAttente: 0 });
    });

    it('419 : jeton rafraîchi par /sync/etat, puis renvoi (n° 15)', async () => {
        const { moteur, serveur } = creerMoteur();
        await moteur.definirUtilisateur(7);
        let premiere = true;
        serveur.statutLot = () => {
            const statut = premiere ? 419 : 200;
            premiere = false;

            return statut;
        };

        await moteur.enregistrer({ type: 'test.noter', charge: {} });
        await moteur.vider();

        const posts = serveur.requetes.filter((r) => r.url === URL_OPERATIONS);
        expect(posts).toHaveLength(2);
        expect(posts[1].entetes?.['X-CSRF-TOKEN']).toMatch(/^jeton-/);
        expect(posts[1].entetes?.['X-CSRF-TOKEN']).not.toBe(
            posts[0].entetes?.['X-CSRF-TOKEN'],
        );
        expect(moteur.etat.enAttente).toBe(0);
    });

    it('échec réseau : hors ligne aussitôt, délais croissants 2 s, 4 s, 8 s', async () => {
        const { moteur, serveur, minuterie } = creerMoteur();
        await moteur.definirUtilisateur(7);
        serveur.panne = true;

        await moteur.enregistrer({ type: 'test.noter', charge: {} });
        await moteur.vider();
        expect(moteur.etat.reseau).toBe('hors_ligne');

        for (let rang = 0; rang < 2; rang += 1) {
            minuterie.actives().at(-1)?.rappel();
            await moteur.vider();
        }

        expect(
            minuterie.attentes
                .map((attente) => attente.delai)
                .filter((delai) => delai !== 30_000),
        ).toEqual([
            DELAI_INITIAL_MS,
            DELAI_INITIAL_MS * 2,
            DELAI_INITIAL_MS * 4,
        ]);
    });

    it('un refus passe dans « À corriger » ; abandonner le retire', async () => {
        const { moteur, serveur } = creerMoteur();
        await moteur.definirUtilisateur(7);
        serveur.verdict = () => ({
            verdict: 'rejetee',
            motif: 'Note négative.',
        });
        const rejets: string[] = [];
        moteur.on('rejetee', (uuid, motif) => rejets.push(`${uuid}:${motif}`));

        const uuid = await moteur.enregistrer({
            type: 'test.noter',
            charge: {},
        });
        await moteur.vider();

        expect(rejets).toEqual([`${uuid}:Note négative.`]);
        expect(await moteur.aCorriger()).toMatchObject([
            { uuid, genre: 'rejetee', motif: 'Note négative.' },
        ]);
        expect(moteur.etat).toMatchObject({ enAttente: 0, anomalies: 1 });

        await moteur.abandonner(uuid);
        expect(moteur.etat.anomalies).toBe(0);
    });

    it('un « déjà reçu » d’un geste refusé reste un refus', async () => {
        const { moteur, serveur } = creerMoteur();
        await moteur.definirUtilisateur(7);
        serveur.verdict = () => ({
            verdict: 'deja_recue',
            origine: 'rejetee',
            motif: 'Refusé.',
        });

        await moteur.enregistrer({ type: 'test.noter', charge: {} });
        await moteur.vider();

        expect(moteur.etat).toMatchObject({ enAttente: 0, anomalies: 1 });
    });

    it(`après ${ESSAIS_MAX} erreurs, le geste devient une anomalie réessayable`, async () => {
        const { moteur, serveur, minuterie } = creerMoteur();
        await moteur.definirUtilisateur(7);
        serveur.verdict = () => ({ verdict: 'erreur', motif: 'Panne.' });

        const uuid = await moteur.enregistrer({
            type: 'test.noter',
            charge: {},
        });
        await moteur.vider();

        for (let rang = 1; rang < ESSAIS_MAX; rang += 1) {
            minuterie.actives().at(-1)?.rappel();
            await moteur.vider();
        }

        expect(await moteur.aCorriger()).toMatchObject([
            { uuid, genre: 'erreur' },
        ]);

        serveur.verdict = () => ({ verdict: 'acceptee', resultat: null });
        await moteur.reessayer(uuid);
        await moteur.vider();

        expect(moteur.etat).toMatchObject({ enAttente: 0, anomalies: 0 });
    });

    it('un geste reporté reste dans la file et n’est pas renvoyé en boucle', async () => {
        const { moteur, serveur } = creerMoteur();
        await moteur.definirUtilisateur(7);
        serveur.verdict = () => ({
            verdict: 'reporte',
            motif: 'Pas connecté.',
        });

        await moteur.enregistrer({ type: 'test.noter', charge: {} });
        await moteur.vider();

        expect(serveur.lots).toHaveLength(1);
        expect(moteur.etat.enAttente).toBe(1);
    });

    it('enregistre l’appareil, puis envoie son jeton et le décalage d’horloge', async () => {
        const { moteur, serveur } = creerMoteur();
        await moteur.definirUtilisateur(7);

        await moteur.enregistrer({ type: 'test.noter', charge: {} });
        await moteur.vider();

        const corps = serveur.requetes.find((r) => r.url === URL_OPERATIONS)
            ?.corps as
            | { appareil: string; decalage_horloge_ms: unknown }
            | undefined;
        expect(corps?.appareil).toBe('jeton-appareil');
        expect(typeof corps?.decalage_horloge_ms).toBe('number');
        expect(await base.lireMeta('appareil')).toBe('jeton-appareil');
    });

    it('attendre le verdict : accepté, ou « en attente » au bout du délai', async () => {
        const { moteur, serveur, minuterie } = creerMoteur();
        await moteur.definirUtilisateur(7);

        await expect(
            moteur.enregistrerEtAttendre(
                { type: 'test.noter', charge: {} },
                8000,
            ),
        ).resolves.toEqual({ verdict: 'acceptee', resultat: { ok: true } });

        serveur.panne = true;
        const attente = moteur.enregistrerEtAttendre(
            { type: 'test.noter', charge: {} },
            8000,
        );
        await new Promise((resoudre) => setTimeout(resoudre, 20));
        minuterie.attentes
            .find((a) => a.delai === 8000 && !a.annulee)
            ?.rappel();

        await expect(attente).resolves.toEqual({ verdict: 'en_attente' });
    });
});

describe('UUID v7 (n° 16)', () => {
    it('monotones dans une même milliseconde, et quand l’horloge recule', () => {
        let ms = 1_700_000_000_000;
        const generer = creerGenerateurUuid7(() => ms);
        const suite: string[] = [];

        for (let rang = 0; rang < 500; rang += 1) {
            suite.push(generer());
        }

        ms -= 5_000;
        suite.push(generer(), generer());

        expect([...suite].sort()).toEqual(suite);
        expect(new Set(suite).size).toBe(suite.length);
    });

    it('version 7 et variante RFC, jamais v4', () => {
        const generer = creerGenerateurUuid7();

        for (let rang = 0; rang < 50; rang += 1) {
            const uuid = generer();
            expect(uuid).toMatch(
                /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
            );
        }
    });

    it('porte l’horodatage en tête', () => {
        const generer = creerGenerateurUuid7(() => 0x0123456789ab);

        expect(generer().replace('-', '').slice(0, 12)).toBe('0123456789ab');
    });
});
