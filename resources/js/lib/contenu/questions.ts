import type { DocumentBlocs } from '@/lib/contenu/blocs';

/**
 * Questions côté appareil (PLAN M5) : les neuf types, leur réponse et leur
 * correction. Format détaillé dans `App\Support\FormatQuestion`.
 *
 * `corriger()` ne sert qu'à **répondre tout de suite** : la correction du
 * serveur fait foi (HORS_LIGNE.md A.6). Les deux lisent le même jeu
 * d'exemples, `tests/fixtures/questions.json`.
 */
export type TypeQuestion =
    | 'qcm_une'
    | 'qcm_plusieurs'
    | 'vrai_faux'
    | 'numerique'
    | 'courte'
    | 'trous'
    | 'appariement'
    | 'ordre'
    | 'ouverte';

export const TYPES_QUESTION: TypeQuestion[] = [
    'qcm_une',
    'qcm_plusieurs',
    'vrai_faux',
    'numerique',
    'courte',
    'trous',
    'appariement',
    'ordre',
    'ouverte',
];

/** Une option de QCM, ou un élément d'appariement ou de remise en ordre. */
export type Element = { id: string; texte: string; latex?: string };

export type SegmentTrous =
    | { texte: string }
    | { trou: string; choix?: string[] };

export type Critere = { id: string; critere: string; points: number };

export type DonneesQuestion = {
    options?: Element[];
    unite?: string;
    segments?: SegmentTrous[];
    gauche?: Element[];
    droite?: Element[];
    elements?: Element[];
    bareme?: Critere[];
};

/** La réponse de l'élève, selon le type (une seule clé utilisée à la fois). */
export type ReponseQuestion = {
    option?: string;
    options?: string[];
    valeur?: boolean | string;
    texte?: string;
    trous?: Record<string, string>;
    paires?: Record<string, string>;
    ordre?: string[];
};

export type EtapeCorrige = { titre: string; blocs: DocumentBlocs };

/**
 * Une question telle que l'élève la reçoit (props ou pack) : la **version
 * publiée**, éléments déjà mélangés par le serveur là où l'ordre trahirait
 * la réponse (appariement, remise en ordre).
 */
export type QuestionEleve = {
    uuid: string;
    version: number;
    type: TypeQuestion;
    enonce: DocumentBlocs;
    donnees: DonneesQuestion;
    attendue: Record<string, unknown>;
    indices: DocumentBlocs[];
    corrige: EtapeCorrige[];
    est_exemple: boolean;
    matiere: string;
    matiere_nom: string;
    notion: string;
};

export type Verdict = 'juste' | 'partiel' | 'faux' | 'a_evaluer';

/** Une réponse n'est juste qu'à 100 ; entre les deux, « En partie juste ». */
export function verdictDe(score: number | null): Verdict {
    if (score === null) {
        return 'a_evaluer';
    }

    if (score >= 100) {
        return 'juste';
    }

    return score > 0 ? 'partiel' : 'faux';
}

/**
 * Forme comparable d'une réponse écrite : sans accents, sans casse, sans
 * ponctuation, espaces réduits (« L’Été ! » → « l ete »).
 */
export function normaliserTexte(texte: string): string {
    return texte
        .normalize('NFD')
        .replace(/\p{Mn}/gu, '')
        .toLowerCase()
        .replace(/œ/g, 'oe')
        .replace(/æ/g, 'ae')
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim();
}

/** Nombre tapé : virgule ou point, espaces de milliers permis. */
export function lireNombre(valeur: unknown): number | null {
    if (typeof valeur === 'number') {
        return Number.isFinite(valeur) ? valeur : null;
    }

    if (typeof valeur !== 'string' || valeur.length > 40) {
        return null;
    }

    const texte = valeur.replace(/[\s  ]+/g, '').replace(/,/g, '.');

    return /^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(texte) ? parseFloat(texte) : null;
}

type Objet = Record<string, unknown>;

const estObjet = (v: unknown): v is Objet =>
    typeof v === 'object' && v !== null && !Array.isArray(v);

const tout = (juste: boolean) => (juste ? 100 : 0);

const part = (justes: number, total: number) =>
    Math.floor((100 * justes) / total);

function texteAccepte(texte: unknown, acceptees: unknown): boolean {
    if (typeof texte !== 'string' || !Array.isArray(acceptees)) {
        return false;
    }

    const saisi = normaliserTexte(texte);

    return (
        saisi !== '' &&
        acceptees.some(
            (a) => typeof a === 'string' && normaliserTexte(a) === saisi,
        )
    );
}

function nombreJuste(attendue: Objet, valeur: unknown): boolean {
    const nombre = lireNombre(valeur);
    const cible = attendue.valeur;

    if (nombre === null || typeof cible !== 'number') {
        return false;
    }

    let tolerance = Number(attendue.tolerance ?? 0);

    if (attendue.relative === true) {
        tolerance = (Math.abs(cible) * tolerance) / 100;
    }

    return (
        Math.abs(nombre - cible) <=
        tolerance + 1e-9 * Math.max(1, Math.abs(cible))
    );
}

/**
 * Score de 0 à 100 ; une réponse mal formée vaut 0. `null` : question
 * ouverte, en attente de l'auto-évaluation.
 */
export function corriger(
    type: TypeQuestion,
    attendue: Objet,
    reponse: Objet,
): number | null {
    switch (type) {
        case 'qcm_une':
            return tout(
                typeof reponse.option === 'string' &&
                    reponse.option === attendue.option,
            );
        case 'qcm_plusieurs': {
            const bonnes = Array.isArray(attendue.options)
                ? (attendue.options as string[])
                : [];

            if (!Array.isArray(reponse.options) || bonnes.length === 0) {
                return 0;
            }

            const choisies = [
                ...new Set(
                    reponse.options.filter(
                        (o): o is string => typeof o === 'string',
                    ),
                ),
            ];
            const justes = choisies.filter((o) => bonnes.includes(o)).length;

            return Math.max(
                0,
                part(justes - (choisies.length - justes), bonnes.length),
            );
        }
        case 'vrai_faux':
            return tout(
                typeof reponse.valeur === 'boolean' &&
                    reponse.valeur === attendue.valeur,
            );
        case 'numerique':
            return tout(nombreJuste(attendue, reponse.valeur));
        case 'courte':
            return tout(texteAccepte(reponse.texte, attendue.acceptees));
        case 'trous': {
            const trous = estObjet(attendue.trous) ? attendue.trous : {};
            const ids = Object.keys(trous);

            if (!estObjet(reponse.trous) || ids.length === 0) {
                return 0;
            }

            const saisis = reponse.trous;

            return part(
                ids.filter((id) => texteAccepte(saisis[id], trous[id])).length,
                ids.length,
            );
        }
        case 'appariement': {
            const paires = estObjet(attendue.paires) ? attendue.paires : {};
            const ids = Object.keys(paires);

            if (!estObjet(reponse.paires) || ids.length === 0) {
                return 0;
            }

            const donnees = reponse.paires;

            return part(
                ids.filter((id) => donnees[id] === paires[id]).length,
                ids.length,
            );
        }
        case 'ordre': {
            const ordre = Array.isArray(attendue.ordre)
                ? (attendue.ordre as string[])
                : [];
            const donne = reponse.ordre;

            if (
                !Array.isArray(donne) ||
                ordre.length === 0 ||
                donne.length !== ordre.length
            ) {
                return 0;
            }

            // Une réponse qui n'est pas une permutation des éléments ne vaut rien.
            const trie = (l: unknown[]) =>
                [...l].map(String).sort().join('\u0000');

            if (
                donne.some((d) => typeof d !== 'string') ||
                trie(donne) !== trie(ordre)
            ) {
                return 0;
            }

            return part(
                ordre.filter((id, rang) => donne[rang] === id).length,
                ordre.length,
            );
        }
        case 'ouverte':
            return null;
    }
}

/** Auto-évaluation d'une question ouverte : la part des points cochés. */
export function scoreAutoEvaluation(
    donnees: DonneesQuestion,
    criteres: string[],
): number {
    let total = 0;
    let obtenus = 0;

    for (const critere of donnees.bareme ?? []) {
        total += critere.points;

        if (criteres.includes(critere.id)) {
            obtenus += critere.points;
        }
    }

    return total === 0 ? 0 : part(obtenus, total);
}

/** L'élève a-t-il assez répondu pour « Vérifier » ? */
export function reponseComplete(
    question: Pick<QuestionEleve, 'type' | 'donnees'>,
    reponse: ReponseQuestion,
): boolean {
    const { donnees } = question;

    switch (question.type) {
        case 'qcm_une':
            return typeof reponse.option === 'string';
        case 'qcm_plusieurs':
            return (reponse.options ?? []).length > 0;
        case 'vrai_faux':
            return typeof reponse.valeur === 'boolean';
        case 'numerique':
            return lireNombre(reponse.valeur) !== null;
        case 'courte':
        case 'ouverte':
            return normaliserTexte(reponse.texte ?? '') !== '';
        case 'trous':
            return (donnees.segments ?? []).every(
                (s) =>
                    !('trou' in s) ||
                    normaliserTexte(reponse.trous?.[s.trou] ?? '') !== '',
            );
        case 'appariement':
            return (donnees.gauche ?? []).every(
                (g) => typeof reponse.paires?.[g.id] === 'string',
            );
        case 'ordre':
            return (
                (reponse.ordre ?? []).length === (donnees.elements ?? []).length
            );
    }
}

/**
 * Réponse de départ : la remise en ordre part de l'ordre affiché (déjà
 * mélangé par le serveur), les autres de rien.
 */
export function reponseInitiale(
    question: Pick<QuestionEleve, 'type' | 'donnees'>,
): ReponseQuestion {
    return question.type === 'ordre'
        ? { ordre: (question.donnees.elements ?? []).map((e) => e.id) }
        : {};
}
