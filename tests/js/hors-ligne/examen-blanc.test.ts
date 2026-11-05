import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import type { QuestionEleve } from '@/lib/contenu/questions';
import type { SujetEleve } from '@/lib/contenu/sujets';
import { noteExamen } from '@/lib/examen-blanc/note';
import type { PartieNotee } from '@/lib/examen-blanc/note';
import {
    allerA,
    clore,
    controlerHorloge,
    demarrer,
    dureeConnue,
    envoyer,
    evaluer,
    examenEnCours,
    formaterRestant,
    noter,
    noterHeure,
    repondre,
    tempsRestantMs,
} from '@/lib/examen-blanc/passage';
import { BaseHorsLigne } from '@/lib/hors-ligne/base';
import type { NouveauGeste } from '@/lib/hors-ligne/moteur';
import exemples from '../../fixtures/notes-examen.json';

const NOM = 'nkaramogo-examen-test';
const DEBUT = Date.parse('2026-11-05T08:00:00Z');
const MINUTE = 60_000;

const paragraphe = (texte: string) => ({
    type: 'doc' as const,
    content: [
        {
            type: 'paragraph' as const,
            content: [{ type: 'text' as const, text: texte }],
        },
    ],
});

function question(
    uuid: string,
    champs: Partial<QuestionEleve> = {},
): QuestionEleve {
    return {
        uuid,
        version: 1,
        type: 'qcm_une',
        enonce: paragraphe('Énoncé'),
        donnees: {
            options: [
                { id: 'a', texte: 'Oui' },
                { id: 'b', texte: 'Non' },
            ],
        },
        attendue: { option: 'a' },
        indices: [],
        corrige: [],
        est_exemple: true,
        matiere: 'maths',
        matiere_nom: 'Mathématiques',
        notion: 'Pythagore',
        ...champs,
    };
}

const SUJET = {
    type: 'sujet',
    uuid: 'sujet-1',
    version: 3,
    titre: 'Maths',
    origine: 'officiel',
    session: 2024,
    libelle_session: 'BEPC 2024',
    examen: 'BEPC',
    serie: null,
    matiere: { cle: 'maths', nom: 'Mathématiques', slug: 'maths' },
    duree_minutes: null,
    coefficient: null,
    est_exemple: true,
    document: null,
    parties: [
        {
            uuid: 'p1',
            titre: 'Exercice 1',
            bareme: 4,
            consigne: paragraphe(''),
            questions: [question('q1'), question('q2')],
        },
        {
            uuid: 'p2',
            titre: 'Exercice 2',
            bareme: 6,
            consigne: paragraphe(''),
            questions: [
                question('q3', {
                    type: 'ouverte',
                    donnees: {
                        bareme: [
                            { id: 'c1', critere: 'Cite', points: 2 },
                            { id: 'c2', critere: 'Conclut', points: 2 },
                        ],
                    },
                    attendue: {},
                }),
            ],
        },
    ],
} as SujetEleve;

let base: BaseHorsLigne;

async function nouvelExamen() {
    base = new BaseHorsLigne(NOM);

    return demarrer(base, {
        id: '0192f3a4-5b6c-7d8e-9f01-23456789abcd',
        auteur: 7,
        sujet: SUJET,
        duree_minutes: 120,
        origine_duree: 'choisie',
        maintenant: DEBUT,
    });
}

afterEach(async () => {
    base?.close();
    await new BaseHorsLigne(NOM).delete();
});

describe('note de l’examen blanc (même jeu que le serveur)', () => {
    it.each(exemples.notes)('$nom', (exemple) => {
        const resultat = noteExamen(exemple.parties as PartieNotee[]);

        expect(resultat.note).toBe(exemple.note);
        expect(resultat.parties.map((p) => p.points)).toEqual(exemple.points);
    });
});

describe('passage sur l’appareil (HORS_LIGNE.md A.8)', () => {
    it('A.14 n° 20 — rouvert à la bonne question, réponses gardées, après un redémarrage', async () => {
        const examen = await nouvelExamen();
        await repondre(base, examen.id, 'q1', 1, { option: 'a' });
        await allerA(base, examen.id, 1);
        await repondre(base, examen.id, 'q2', 1, { option: 'b' });
        await allerA(base, examen.id, 2);

        // Onglet fermé, téléphone redémarré : une nouvelle connexion à la base.
        base.close();
        base = new BaseHorsLigne(NOM);
        const repris = await examenEnCours(base, 7, 'sujet-1');

        expect(repris?.question_courante).toBe(2);
        expect(repris?.reponses.q1.reponse).toEqual({ option: 'a' });
        expect(repris?.reponses.q2).toEqual({
            version: 1,
            reponse: { option: 'b' },
            criteres: null,
        });
        expect(await examenEnCours(base, 8, 'sujet-1')).toBeNull();
    });

    it('A.14 n° 21 — chronomètre calculé depuis l’heure de début : le temps court application fermée', async () => {
        const examen = await nouvelExamen();

        expect(tempsRestantMs(examen, DEBUT)).toBe(120 * MINUTE);
        // Fermée 45 min puis rouverte : 45 min de moins, sans rien additionner.
        expect(tempsRestantMs(examen, DEBUT + 45 * MINUTE)).toBe(75 * MINUTE);
        expect(tempsRestantMs(examen, DEBUT + 3 * 60 * MINUTE)).toBe(0);
        expect(formaterRestant(75 * MINUTE)).toBe('1:15:00');
        expect(formaterRestant(9 * MINUTE + 7_000)).toBe('9:07');
    });

    it('temps écoulé application fermée : fin à l’heure de la fin du temps', async () => {
        const examen = await nouvelExamen();
        const clos = await clore(base, examen.id, DEBUT + 5 * 60 * MINUTE);

        expect(clos.statut).toBe('a_evaluer');
        expect(clos.temps_ecoule).toBe(true);
        expect(clos.termine_le).toBe(
            new Date(DEBUT + 120 * MINUTE).toISOString(),
        );
        // Clore deux fois ne change rien.
        expect(
            (await clore(base, examen.id, DEBUT + 6 * 60 * MINUTE)).termine_le,
        ).toBe(clos.termine_le);
    });

    it('une horloge qui recule ou saute est signalée, pas une longue fermeture', async () => {
        const examen = await nouvelExamen();

        expect(controlerHorloge(examen, DEBUT - 10 * MINUTE, null)).toContain(
            'reculé',
        );
        expect(controlerHorloge(examen, DEBUT + 40 * MINUTE, null)).toBeNull();
        expect(controlerHorloge(examen, DEBUT + 40 * MINUTE, 15_000)).toContain(
            'sauté',
        );
        expect(controlerHorloge(examen, DEBUT + 15_000, 15_000)).toBeNull();

        const note = await noterHeure(
            base,
            examen.id,
            DEBUT + 40 * MINUTE,
            15_000,
        );
        expect(note.horloge_suspecte).toBe(true);
    });

    it('la durée : imprimée, sinon celle de l’épreuve, sinon à choisir', () => {
        expect(dureeConnue({ ...SUJET, duree_minutes: 90 }, 120)).toEqual({
            minutes: 90,
            origine: 'imprimee',
        });
        expect(dureeConnue(SUJET, 120)).toEqual({
            minutes: 120,
            origine: 'epreuve',
        });
        expect(dureeConnue(SUJET, null)).toBeNull();
    });

    it('fin : note d’affichage, une seule opération (priorité 0), la ligne quitte la table', async () => {
        const examen = await nouvelExamen();
        await repondre(base, examen.id, 'q1', 1, { option: 'a' });
        await repondre(base, examen.id, 'q3', 1, { texte: 'Ma rédaction' });
        await clore(base, examen.id, DEBUT + 30 * MINUTE);
        const evalue = await evaluer(base, examen.id, 'q3', ['c1']);

        // Partie 1 : 2 / 4 ; partie 2 : 3 / 6 → 5 / 10 → 10 / 20.
        expect(noter(evalue, SUJET).note).toBe(10);

        const gestes: NouveauGeste[] = [];
        const enregistrer = async (geste: NouveauGeste) => {
            gestes.push(geste);

            return geste.uuid ?? '';
        };
        const { note } = await envoyer(base, enregistrer, evalue, SUJET);

        expect(note).toBe(10);
        expect(gestes).toHaveLength(1);
        expect(gestes[0]).toMatchObject({
            uuid: examen.id,
            type: 'examen_blanc.terminer',
            priorite: 0,
            charge: {
                sujet: 'sujet-1',
                version: 3,
                note_appareil: 10,
                duree_minutes: 120,
            },
        });
        // Toutes les questions partent, même sans réponse.
        expect(Object.keys(gestes[0].charge.reponses as object)).toEqual([
            'q1',
            'q2',
            'q3',
        ]);
        expect(await base.examens_blancs.count()).toBe(0);
    });
});
