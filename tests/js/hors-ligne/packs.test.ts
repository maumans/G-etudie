import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { lirePageLocale } from '@/lib/contenu/source';
import { BaseHorsLigne } from '@/lib/hors-ligne/base';
import type {
    RequeteTransport,
    ReponseTransport,
} from '@/lib/hors-ligne/moteur';
import {
    annonceDesPacks,
    ErreurPack,
    matieresTelechargees,
    noterEtatDesPacks,
    packsPresents,
    supprimerPack,
    telechargerPack,
} from '@/lib/hors-ligne/packs';
import type { ManifestePack, PackLocal } from '@/lib/hors-ligne/packs';
import { connaitreProfil, oublierProfil } from '@/lib/hors-ligne/profils';

/*
 * HL5 (HORS_LIGNE.md A.5) : téléchargement par morceaux, reprise au morceau
 * suivant (A.14 n° 22), mise à jour différentielle, éléments retirés, pack
 * qui change pendant le téléchargement, expiration ; les packs survivent à
 * la déconnexion d'un profil, pas ses réponses (A.14 n° 23).
 */

const LECON_A = '01a18f5a-009c-706e-8f15-c520b81a2e6f';
const LECON_B = '01a18f5a-009c-706e-8f15-c520b81a2e70';
const ANNALE = '01a18f5a-009c-706e-8f15-c520b81a2e71';

type Element = {
    cle: string;
    empreinte: string;
    morceau: number;
    props: Record<string, unknown>;
};

function elementsDeBase(): Element[] {
    return [
        {
            cle: 'matiere:bepc-maths',
            empreinte: 'm1',
            morceau: 0,
            props: {
                matiere: { cle: 'maths', nom: 'Mathématiques', slug: 'maths' },
                chapitres: [],
            },
        },
        {
            cle: 'fiche:12',
            empreinte: 'f1',
            morceau: 0,
            props: {
                chapitre: { id: 12, titre: 'Triangles' },
                lecons: [],
                lecons_du_pack: [LECON_A, LECON_B],
            },
        },
        {
            cle: `lecon:${LECON_A}`,
            empreinte: 'a1',
            morceau: 1,
            props: {
                lecon: { uuid: LECON_A, titre: 'Pythagore' },
                contexte: {},
            },
        },
        {
            cle: `lecon:${LECON_B}`,
            empreinte: 'b1',
            morceau: 1,
            props: { lecon: { uuid: LECON_B, titre: 'Thalès' }, contexte: {} },
        },
        {
            cle: `annale:${ANNALE}`,
            empreinte: 'n1',
            morceau: 2,
            props: {
                sujet: { uuid: ANNALE, titre: 'BEPC 2024' },
                duree_epreuve: 120,
            },
        },
    ];
}

/** Faux serveur des packs : version, éléments, et des pannes à la demande. */
function fauxServeur() {
    const serveur = {
        version: 'v1aaaaaaaaaaaaaa',
        elements: elementsDeBase(),
        expire_le: null as string | null,
        requetes: [] as RequeteTransport[],
        /** Coupe le réseau à la N-ième requête de contenu. */
        coupureA: null as number | null,
        contenus: 0,
        /** Change de version juste avant la N-ième requête de contenu. */
        changerA: null as number | null,
        manifeste(): ManifestePack {
            return {
                pack: 'bepc-maths',
                titre: 'Mathématiques · BEPC',
                matiere: { cle: 'maths', nom: 'Mathématiques', slug: 'maths' },
                version: serveur.version,
                genere_le: '2026-11-06T10:00:00Z',
                taille_octets: 4096,
                taille_sans_images: 4096,
                morceaux: 3,
                expire_le: serveur.expire_le,
                est_exemple: true,
                medias: [],
                elements: serveur.elements.map((e) => [
                    e.cle,
                    e.empreinte,
                    e.morceau,
                ]),
            };
        },
        transport: async (
            requete: RequeteTransport,
        ): Promise<ReponseTransport> => {
            serveur.requetes.push(requete);

            if (
                requete.url.endsWith('/prendre') ||
                requete.url.endsWith('/manifeste')
            ) {
                return { statut: 200, corps: serveur.manifeste() };
            }

            serveur.contenus++;

            if (serveur.coupureA === serveur.contenus) {
                throw new TypeError('Failed to fetch');
            }

            if (serveur.changerA === serveur.contenus) {
                serveur.version = 'v2bbbbbbbbbbbbbb';
                serveur.elements = serveur.elements.map((e) =>
                    e.cle === `lecon:${LECON_B}`
                        ? { ...e, empreinte: 'b2' }
                        : e,
                );
            }

            const url = new URL(requete.url, 'http://x');
            const version =
                url.searchParams.get('version') ??
                (requete.corps as { version: string }).version;

            if (version !== serveur.version) {
                return {
                    statut: 409,
                    corps: {
                        message: 'Ce pack vient d’être mis à jour.',
                        version: serveur.version,
                    },
                };
            }

            const morceau = url.pathname.match(/morceaux\/(\d+)/);
            const choisis = morceau
                ? serveur.elements.filter(
                      (e) => e.morceau === Number(morceau[1]),
                  )
                : serveur.elements.filter((e) =>
                      (requete.corps as { cles: string[] }).cles.includes(
                          e.cle,
                      ),
                  );

            return {
                statut: 200,
                corps: {
                    pack: 'bepc-maths',
                    version: serveur.version,
                    elements: choisis.map(({ cle, empreinte, props }) => ({
                        cle,
                        empreinte,
                        props,
                    })),
                },
            };
        },
    };

    return serveur;
}

let base: BaseHorsLigne;
let nom = 0;

beforeEach(() => {
    base = new BaseHorsLigne(`packs-${++nom}`);
});

afterEach(async () => {
    await base.delete();
});

function demandes(serveur: ReturnType<typeof fauxServeur>): string[] {
    return serveur.requetes.map(
        (r) => `${r.methode} ${r.url.replace('/eleve/packs/bepc-maths', '')}`,
    );
}

describe('packs sur l’appareil', () => {
    it('télécharge morceau par morceau et range chaque élément avec ses props', async () => {
        const serveur = fauxServeur();
        const progressions: number[] = [];

        const pack = await telechargerPack(
            base,
            serveur.transport,
            'bepc-maths',
            {
                premier: true,
                surProgression: ({ recus }) => progressions.push(recus),
            },
        );

        expect(pack).toMatchObject({
            statut: 'complet',
            version: serveur.version,
            a_jour: true,
            recus: 5,
            attendus: 5,
        });
        expect(demandes(serveur)).toEqual([
            'POST /prendre',
            `GET /morceaux/0?version=${serveur.version}`,
            `GET /morceaux/1?version=${serveur.version}`,
            `GET /morceaux/2?version=${serveur.version}`,
        ]);
        expect(progressions).toEqual([0, 2, 4, 5]);
        expect(await base.contenus.count()).toBe(5);
        expect(annonceDesPacks(await packsPresents(base))).toBe(
            `bepc-maths@${serveur.version}`,
        );
        expect(await matieresTelechargees(base)).toEqual(['maths']);
    });

    it('A.14 n° 22 — une coupure en plein téléchargement : la reprise part du morceau suivant', async () => {
        const serveur = fauxServeur();
        serveur.coupureA = 2;

        await expect(
            telechargerPack(base, serveur.transport, 'bepc-maths', {
                premier: true,
            }),
        ).rejects.toBeInstanceOf(ErreurPack);
        expect(((await base.packs.get('bepc-maths')) as PackLocal).statut).toBe(
            'en_cours',
        );
        expect(
            ((await base.packs.get('bepc-maths')) as PackLocal).version,
        ).toBeNull();

        serveur.requetes = [];
        serveur.coupureA = null;
        await telechargerPack(base, serveur.transport, 'bepc-maths');

        // Le morceau 0 est déjà là : ni redemandé, ni repris depuis zéro.
        expect(demandes(serveur)).toEqual([
            'GET /manifeste',
            `GET /morceaux/1?version=${serveur.version}`,
            `GET /morceaux/2?version=${serveur.version}`,
        ]);
        expect(((await base.packs.get('bepc-maths')) as PackLocal).statut).toBe(
            'complet',
        );
    });

    it('un morceau presque entier à refaire se reprend d’un coup', async () => {
        const serveur = fauxServeur();
        await telechargerPack(base, serveur.transport, 'bepc-maths', {
            premier: true,
        });
        serveur.version = 'v4dddddddddddddd';
        serveur.elements = serveur.elements.map((e) =>
            e.cle === `annale:${ANNALE}` ? { ...e, empreinte: 'n2' } : e,
        );

        serveur.requetes = [];
        await telechargerPack(base, serveur.transport, 'bepc-maths');

        expect(demandes(serveur)).toEqual([
            'GET /manifeste',
            'GET /morceaux/2?version=v4dddddddddddddd',
        ]);
    });

    it('mise à jour différentielle : seul l’élément changé est redemandé ; un retiré est effacé', async () => {
        const serveur = fauxServeur();
        await telechargerPack(base, serveur.transport, 'bepc-maths', {
            premier: true,
        });

        // L'équipe corrige la leçon A et retire le sujet.
        serveur.version = 'v3cccccccccccccc';
        serveur.elements = serveur.elements
            .filter((e) => e.cle !== `annale:${ANNALE}`)
            .map((e) =>
                e.cle === `lecon:${LECON_A}`
                    ? {
                          ...e,
                          empreinte: 'a2',
                          props: {
                              lecon: {
                                  uuid: LECON_A,
                                  titre: 'Pythagore (revu)',
                              },
                              contexte: {},
                          },
                      }
                    : e,
            );
        await noterEtatDesPacks(base, {
            'bepc-maths': { version: serveur.version, expire_le: null },
        });
        expect(((await base.packs.get('bepc-maths')) as PackLocal).a_jour).toBe(
            false,
        );

        serveur.requetes = [];
        await telechargerPack(base, serveur.transport, 'bepc-maths');

        expect(demandes(serveur)).toEqual(['GET /manifeste', 'POST /elements']);
        expect((serveur.requetes[1].corps as { cles: string[] }).cles).toEqual([
            `lecon:${LECON_A}`,
        ]);
        expect(await base.contenus.get(`annale:${ANNALE}`)).toBeUndefined();
        expect(
            (
                (await base.contenus.get(`lecon:${LECON_A}`)) as {
                    props: { lecon: { titre: string } };
                }
            ).props.lecon.titre,
        ).toBe('Pythagore (revu)');
        expect(((await base.packs.get('bepc-maths')) as PackLocal).a_jour).toBe(
            true,
        );
    });

    it('le pack change pendant le téléchargement (409) : nouveau manifeste, rien de déjà rangé n’est redemandé deux fois', async () => {
        const serveur = fauxServeur();
        serveur.changerA = 2;

        const pack = await telechargerPack(
            base,
            serveur.transport,
            'bepc-maths',
            { premier: true },
        );

        expect(pack.version).toBe('v2bbbbbbbbbbbbbb');
        expect(
            (
                (await base.contenus.get(`lecon:${LECON_B}`)) as {
                    empreinte: string;
                }
            ).empreinte,
        ).toBe('b2');
        expect(
            demandes(serveur).filter((d) => d.includes('/morceaux/0')),
        ).toHaveLength(1);
    });

    it('un refus du serveur garde sa phrase pour l’élève', async () => {
        const transport = async (): Promise<ReponseTransport> => ({
            statut: 403,
            corps: {
                message:
                    'Ton téléchargement gratuit est déjà pris par Français.',
            },
        });

        await expect(
            telechargerPack(base, transport, 'bepc-maths', { premier: true }),
        ).rejects.toMatchObject({
            statut: 403,
            message: 'Ton téléchargement gratuit est déjà pris par Français.',
        });
    });

    it('les écrans s’affichent depuis le pack : fiche assemblée, annale avec son mode, page de la matière', async () => {
        const serveur = fauxServeur();
        await telechargerPack(base, serveur.transport, 'bepc-maths', {
            premier: true,
        });

        const fiche = await lirePageLocale(base, '/eleve/chapitres/12/fiche');
        expect(fiche?.component).toBe('eleve/fiche');
        expect(
            ((fiche?.props.lecons ?? []) as { titre: string }[]).map(
                (l) => l.titre,
            ),
        ).toEqual(['Pythagore', 'Thalès']);

        const annale = await lirePageLocale(
            base,
            `/eleve/sujets/${ANNALE}?mode=examen`,
        );
        expect(annale?.props).toMatchObject({
            mode: 'examen',
            question: null,
            scores: {},
            duree_epreuve: 120,
        });

        const matiere = await lirePageLocale(base, '/eleve/cours/maths');
        expect(matiere).toMatchObject({
            component: 'eleve/matiere',
            cle: 'matiere:bepc-maths',
        });
        expect(await lirePageLocale(base, '/eleve/cours/francais')).toBeNull();

        const lecon = await lirePageLocale(base, `/eleve/lecons/${LECON_A}`);
        expect(lecon?.props.progression).toEqual({ etat: null, position: 0 });
    });

    it('un pack expiré ne s’affiche plus (horloge de l’appareil)', async () => {
        const serveur = fauxServeur();
        serveur.expire_le = '2026-12-08T00:00:00Z';
        await telechargerPack(base, serveur.transport, 'bepc-maths', {
            premier: true,
        });

        expect(
            await lirePageLocale(base, `/eleve/lecons/${LECON_A}`, {
                maintenant: new Date('2026-12-01T00:00:00Z'),
            }),
        ).not.toBeNull();
        expect(
            await lirePageLocale(base, `/eleve/lecons/${LECON_A}`, {
                maintenant: new Date('2026-12-09T00:00:00Z'),
            }),
        ).toBeNull();
        expect(
            await matieresTelechargees(base, new Date('2026-12-09T00:00:00Z')),
        ).toEqual([]);
    });

    it('supprimer un pack efface ses contenus, pas les séances préparées', async () => {
        const serveur = fauxServeur();
        await telechargerPack(base, serveur.transport, 'bepc-maths', {
            premier: true,
        });
        await base.contenus.put({
            cle: 'seance:x',
            pack: 'seances',
            props: {},
        });

        await supprimerPack(base, 'bepc-maths');

        expect(await base.packs.count()).toBe(0);
        expect((await base.contenus.toArray()).map((c) => c.cle)).toEqual([
            'seance:x',
        ]);
    });

    it('A.14 n° 23 — les packs survivent à la déconnexion d’un profil, pas ses réponses', async () => {
        const serveur = fauxServeur();
        await telechargerPack(base, serveur.transport, 'bepc-maths', {
            premier: true,
        });
        await connaitreProfil(base, {
            id: 7,
            prenom: 'Aïssatou',
            pseudo: 'aissa',
        });
        await base.progression.put({
            auteur_id: 7,
            jauge: {},
            serie: {},
            recu_le: '',
        });
        await base.acquittees.put({
            uuid: 'u1',
            type: 'tentative.enregistrer',
            auteur_id: 7,
            resultat: null,
            acquittee_le: '',
        });
        await base.seances.put({
            id: 's1',
            auteur_id: 7,
            rang: 1,
            terminee: false,
        });
        await base.contenus.put({
            cle: 'seance:s1',
            pack: 'seances',
            props: {},
        });

        await oublierProfil(base, 7);

        expect(await base.profils.count()).toBe(0);
        expect(await base.progression.count()).toBe(0);
        expect(await base.acquittees.count()).toBe(0);
        expect(await base.seances.count()).toBe(0);
        expect(await base.contenus.get('seance:s1')).toBeUndefined();
        expect(await base.packs.count()).toBe(1);
        expect(
            await base.contenus.where('pack').equals('bepc-maths').count(),
        ).toBe(5);
    });

    it('un profil qui a encore des réponses en file garde ses données jusqu’à leur envoi', async () => {
        await connaitreProfil(base, {
            id: 7,
            prenom: 'Aïssatou',
            pseudo: 'aissa',
        });
        await base.progression.put({
            auteur_id: 7,
            jauge: {},
            serie: {},
            recu_le: '',
        });
        await base.operations.add({
            uuid: '01a18f5a-009c-706e-8f15-c520b81a2e99',
            type: 'tentative.enregistrer',
            charge: {},
            auteur_id: 7,
            saisi_le: '',
            priorite: 1,
            depend_de: null,
            essais: 0,
            statut: 'en_attente',
            derniere_erreur: null,
        });

        await oublierProfil(base, 7);

        expect(await base.profils.count()).toBe(0);
        expect(await base.operations.count()).toBe(1);
        expect(await base.progression.count()).toBe(1);
    });
});

describe('séances préparées par matière téléchargée (A.10)', () => {
    it('rangées avec leur matière ; hors ligne, la matière ouvre les siennes', async () => {
        const { rangerInstantane, prochaineSeanceLocale } =
            await import('@/lib/progression/locale');
        const seance = (uuid: string, rang: number) => ({
            uuid,
            rang,
            props: { seance: { uuid } },
        });

        await rangerInstantane(base, 7, {
            calcule_le: '2026-11-06T10:00:00Z',
            jauge: {
                pourcentage: 0,
                matieres: [],
                calcule_le: '2026-11-06T10:00:00Z',
            },
            serie: {
                jours: 0,
                rompue: false,
                aujourdhui_fait: false,
                reponses_semaine: 0,
                cases: [],
                calcule_le: '2026-11-06T10:00:00Z',
            },
            seances: [seance('general-1', 1)],
            seances_matieres: {
                maths: [seance('maths-1', 1), seance('maths-2', 2)],
            },
        });

        expect(await prochaineSeanceLocale(base, 7)).toBe('general-1');
        expect(await prochaineSeanceLocale(base, 7, 'maths')).toBe('maths-1');
        expect(await prochaineSeanceLocale(base, 7, 'francais')).toBeNull();
        expect(await base.contenus.get('seance:maths-2')).toBeDefined();
    });
});
