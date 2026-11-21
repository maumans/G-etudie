import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BaseHorsLigne } from '@/lib/hors-ligne/base';
import type { NouveauGeste } from '@/lib/hors-ligne/moteur';
import {
    chargeAvis,
    doitProposerAvis,
    ETIQUETTES,
    INTERVALLE_PROPOSITION_MS,
    noterAvisPropose,
} from '@/lib/terrain/avis';
import {
    alertesDiagnostic,
    codeDiagnostic,
    collecterDiagnostic,
    formaterDecalage,
    formaterOctets,
    lireAgent,
} from '@/lib/terrain/diagnostic';
import type { SourcesDiagnostic } from '@/lib/terrain/diagnostic';
import {
    CLE_ERREURS,
    cheminSeul,
    confierErreurs,
    ERREURS_GARDEES,
    installerCaptureErreurs,
    normaliserErreur,
    rangerErreur,
} from '@/lib/terrain/erreurs';
import type { ErreurCaptee } from '@/lib/terrain/erreurs';

/**
 * Lot 14 (terrain) : erreurs captées puis confiées à la file, diagnostic lu
 * sur l'appareil, « Ton avis » proposé une fois par semaine.
 */

const NOM = 'nkaramogo-terrain-test';
let base: BaseHorsLigne;

beforeEach(() => {
    base = new BaseHorsLigne(NOM);
});

afterEach(async () => {
    base.close();
    indexedDB.deleteDatabase(NOM);
    vi.useRealTimers();
});

describe('erreurs captées', () => {
    it('garde le chemin seul, coupe message et pile, écarte le bruit', () => {
        expect(
            cheminSeul('https://nkaramogo.gn/eleve/sujets/12?jeton=x#a'),
        ).toBe('/eleve/sujets/12');
        expect(cheminSeul(null)).toBeNull();

        const erreur = normaliserErreur(
            'script',
            {
                message: 'x'.repeat(900),
                source: 'https://nkaramogo.gn/build/a.js?v=2',
                pile: 'p'.repeat(5000),
            },
            'v1',
        );
        expect(erreur?.message).toHaveLength(500);
        expect(erreur?.pile).toHaveLength(2000);
        expect(erreur?.source).toBe('/build/a.js');
        expect(erreur?.version_app).toBe('v1');

        expect(
            normaliserErreur('script', { message: 'Script error.' }, null),
        ).toBeNull();
        expect(
            normaliserErreur(
                'script',
                { message: 'ResizeObserver loop completed' },
                null,
            ),
        ).toBeNull();
        expect(
            normaliserErreur(
                'script',
                { message: 'x', source: 'chrome-extension://abc/x.js' },
                null,
            ),
        ).toBeNull();
        expect(normaliserErreur('promesse', { message: '' }, null)).toBeNull();
    });

    it('regroupe une même erreur et n’en garde que cinquante', async () => {
        const e = (message: string): ErreurCaptee =>
            normaliserErreur('script', { message }, 'v1') as ErreurCaptee;

        await rangerErreur(base, e('A'));
        await rangerErreur(base, e('A'));
        await rangerErreur(base, e('B'));

        let gardees = (await base.lireMeta<ErreurCaptee[]>(CLE_ERREURS)) ?? [];
        expect(gardees.map((g) => [g.message, g.fois])).toEqual([
            ['A', 2],
            ['B', 1],
        ]);

        for (let i = 0; i < 60; i++) {
            await rangerErreur(base, e(`N${i}`));
        }

        gardees = (await base.lireMeta<ErreurCaptee[]>(CLE_ERREURS)) ?? [];
        expect(gardees).toHaveLength(ERREURS_GARDEES);
        expect(gardees.at(-1)?.message).toBe('N59');
    });

    it('confie vingt erreurs par geste, et rien sans élève connecté', async () => {
        for (let i = 0; i < 25; i++) {
            await rangerErreur(
                base,
                normaliserErreur(
                    'script',
                    { message: `E${i}` },
                    null,
                ) as ErreurCaptee,
            );
        }

        const gestes: NouveauGeste[] = [];
        const enregistrer = async (g: NouveauGeste) => {
            gestes.push(g);

            return 'uuid';
        };

        expect(await confierErreurs(base, enregistrer, null)).toBe(0);
        expect(gestes).toHaveLength(0);

        expect(await confierErreurs(base, enregistrer, 7)).toBe(20);
        expect(await confierErreurs(base, enregistrer, 7)).toBe(5);
        expect(await confierErreurs(base, enregistrer, 7)).toBe(0);
        expect(gestes.map((g) => [g.type, g.priorite])).toEqual([
            ['erreurs.signaler', 9],
            ['erreurs.signaler', 9],
        ]);
        expect((gestes[0].charge.erreurs as unknown[]).length).toBe(20);
    });

    it('écoute la fenêtre et confie les erreurs après le délai', async () => {
        const auditeurs: Record<string, (e: Event) => void> = {};
        const cible = {
            addEventListener: (type: string, rappel: (e: Event) => void) => {
                auditeurs[type] = rappel;
            },
        } as unknown as Pick<Window, 'addEventListener'>;
        const gestes: NouveauGeste[] = [];

        const capture = installerCaptureErreurs({
            base,
            enregistrer: async (g) => {
                gestes.push(g);

                return 'uuid';
            },
            auteur: () => 3,
            version: () => 'v9',
            cible,
            delaiEnvoiMs: 10,
        });

        auditeurs.error({
            message: 'TypeError: boum',
            filename: 'https://x.gn/build/s.js?q=1',
            error: new Error('boum'),
        } as unknown as Event);
        // Une ressource absente n'a pas de message : ignorée.
        auditeurs.error({} as Event);
        auditeurs.unhandledrejection({
            reason: new RangeError('trop loin'),
        } as unknown as Event);

        await vi.waitFor(() => expect(gestes).toHaveLength(1), {
            timeout: 2000,
        });

        const erreurs = gestes[0].charge.erreurs as ErreurCaptee[];
        expect(erreurs.map((e) => [e.type, e.message, e.source])).toEqual([
            ['script', 'TypeError: boum', '/build/s.js'],
            ['promesse', 'RangeError: trop loin', null],
        ]);
        expect(erreurs[0].version_app).toBe('v9');
        expect(await capture.confier()).toBe(0);
    });
});

describe('diagnostic', () => {
    const sources = (
        modif: Partial<SourcesDiagnostic> = {},
    ): SourcesDiagnostic => ({
        version: () => 'v14',
        navigateur: () =>
            ({
                userAgent:
                    'Mozilla/5.0 (Linux; Android 11; TECNO KF6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
                language: 'fr-FR',
                hardwareConcurrency: 4,
                deviceMemory: 2,
                connection: { effectiveType: '3g', saveData: true },
                storage: {
                    estimate: async () => ({
                        usage: 3_400_000,
                        quota: 40_000_000,
                    }),
                    persisted: async () => false,
                },
                serviceWorker: {
                    getRegistration: async () => ({
                        active: {},
                        waiting: null,
                    }),
                },
            }) as unknown as ReturnType<SourcesDiagnostic['navigateur']>,
        fenetre: () => ({
            largeur: 360,
            hauteur: 740,
            autonome: true,
            sombre: true,
        }),
        file: async () => ({
            en_attente: 4,
            a_corriger: 1,
            derniere_synchro: '2026-11-20T09:00:00.000Z',
            decalage_horloge_ms: 400_000,
        }),
        packs: async () => ({ nombre: 1, poids: 1_850_000 }),
        profils: async () => 2,
        erreurs: async () => 3,
        ...modif,
    });

    it('lit l’appareil sans rien de personnel', async () => {
        const d = await collecterDiagnostic(sources());

        expect(d).toMatchObject({
            version_app: 'v14',
            service_worker: 'actif',
            installee: true,
            stockage_utilise: 3_400_000,
            stockage_persistant: false,
            packs: 1,
            en_attente: 4,
            a_corriger: 1,
            navigateur: 'Chrome 131',
            systeme: 'Android 11',
            memoire_go: 2,
            reseau: '3g',
            economie_donnees: true,
            ecran: '360×740',
            theme: 'sombre',
            erreurs_gardees: 3,
        });
        expect(JSON.stringify(d)).not.toMatch(/TECNO/);
    });

    it('survit à un navigateur qui ne dit rien', async () => {
        const d = await collecterDiagnostic(
            sources({
                navigateur: () =>
                    ({ userAgent: 'Inconnu' }) as unknown as ReturnType<
                        SourcesDiagnostic['navigateur']
                    >,
                file: async () => {
                    throw new Error('base fermée');
                },
            }),
        );

        expect(d.service_worker).toBe('indisponible');
        expect(d.stockage_utilise).toBeNull();
        expect(d.en_attente).toBe(0);
        expect(d.navigateur).toBeNull();
    });

    it('distingue la première installation d’une version en attente', async () => {
        const avec = (inscription: unknown) =>
            sources({
                navigateur: () =>
                    ({
                        userAgent: 'x',
                        serviceWorker: {
                            getRegistration: async () => inscription,
                        },
                    }) as unknown as ReturnType<
                        SourcesDiagnostic['navigateur']
                    >,
            });

        const installation = await collecterDiagnostic(
            avec({ active: null, installing: {}, waiting: null }),
        );
        expect(installation.service_worker).toBe('installation');
        expect(alertesDiagnostic(installation)).not.toContain(
            'Une nouvelle version attend d’être activée.',
        );
        expect(
            (await collecterDiagnostic(avec({ active: {}, waiting: {} })))
                .service_worker,
        ).toBe('en_attente');
        expect(
            (await collecterDiagnostic(avec(undefined))).service_worker,
        ).toBe('absent');
    });

    it('signale ce qui demande l’attention', async () => {
        const alertes = alertesDiagnostic(await collecterDiagnostic(sources()));

        expect(alertes).toEqual([
            '1 geste(s) à corriger.',
            'L’heure du téléphone n’est pas juste.',
            'Le stockage n’est pas protégé : le téléphone peut effacer les téléchargements.',
            'Il reste très peu de place sur le téléphone.',
        ]);
    });

    it('fabrique un code de six caractères sans lettre à confondre', () => {
        const code = codeDiagnostic();
        expect(code).toMatch(/^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{6}$/);
        expect(
            codeDiagnostic(() => new Uint8Array([0, 31, 32, 18, 255, 10])),
        ).toBe('0Z0JZA');
    });

    it('lit les agents courants', () => {
        expect(
            lireAgent(
                'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
            ),
        ).toEqual({ navigateur: 'Safari 17', systeme: 'iOS 17' });
        expect(
            lireAgent(
                'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36 OPR/85.0',
            ),
        ).toEqual({ navigateur: 'Opera 85', systeme: 'Android 10' });
    });

    it('formate octets et décalage en français', () => {
        expect(formaterOctets(3_400_000)).toBe('3,4 Mo');
        expect(formaterOctets(980_000)).toBe('980 Ko');
        expect(formaterOctets(null)).toBe('inconnu');
        expect(formaterDecalage(null)).toBe('pas encore mesuré');
        expect(formaterDecalage(30_000)).toBe('à l’heure');
        expect(formaterDecalage(360_000)).toBe('6 min de retard');
        expect(formaterDecalage(-360_000)).toBe('6 min d’avance');
    });
});

describe('« Ton avis »', () => {
    it('est proposé une fois par semaine et par profil', async () => {
        const t0 = Date.parse('2026-11-20T18:00:00Z');

        expect(await doitProposerAvis(base, null, t0)).toBe(false);
        expect(await doitProposerAvis(base, 1, t0)).toBe(true);

        await noterAvisPropose(base, 1, t0);
        expect(await doitProposerAvis(base, 1, t0 + 3600_000)).toBe(false);
        expect(await doitProposerAvis(base, 2, t0)).toBe(true);
        expect(
            await doitProposerAvis(base, 1, t0 + INTERVALLE_PROPOSITION_MS),
        ).toBe(true);
    });

    it('prépare une charge propre', () => {
        expect(
            chargeAvis({
                ecran: 'seance',
                reponse: 'non',
                etiquettes: ['lent', 'lent', 'inventee'],
                commentaire: '   ',
                version: 'v1',
            }),
        ).toEqual({
            ecran: 'seance',
            reponse: 'non',
            etiquettes: ['lent'],
            commentaire: null,
            version_app: 'v1',
        });
    });

    it('a les mêmes étiquettes que le serveur (App\\Enums\\EtiquetteAvis)', () => {
        expect(ETIQUETTES.map((e) => e.cle)).toEqual([
            'lent',
            'donnees',
            'pas_compris',
            'difficile',
            'facile',
            'bug',
        ]);
    });
});
