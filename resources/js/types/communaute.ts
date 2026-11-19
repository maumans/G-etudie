import type { CleMatiere } from '@/lib/matieres';

/** Une publication du fil d'un groupe (FilGroupeService::fil, lot 12). */
export type Publication = {
    uuid: string;
    texte: string;
    /** Pseudo pour un élève ; prénom pour l'enseignant ; « Prénom (pseudo) » vu par l'enseignant. */
    auteur: string;
    est_enseignant: boolean;
    est_moi: boolean;
    cree_le: string;
    masquee: boolean;
    masquage: 'enseignant' | 'signalements' | null;
    /** Signalements en attente (enseignant seulement). */
    signalements: number | null;
    signalee_par_moi: boolean;
    /** Pour « retirer la parole » (enseignant seulement). */
    auteur_id: number | null;
    est_exemple: boolean;
};

export type QuestionFil = Publication & {
    matiere: { cle: CleMatiere; nom: string } | null;
    reponses: Publication[];
};

export type Fil = {
    questions: QuestionFil[];
    ferme: boolean;
    muet_jusqu_au: string | null;
    reste_aujourdhui: number | null;
    a_moderer: number | null;
};

export type PropsFil = {
    groupe: {
        id: number;
        nom: string;
        enseignant: string;
        examen: string;
        archive: boolean;
        est_exemple: boolean;
    };
    fil: Fil;
    matieres: { slug: string; nom: string; cle: CleMatiere }[];
    motifs: { valeur: string; libelle: string }[];
    limites: { texte_max: number; par_jour: number };
};
