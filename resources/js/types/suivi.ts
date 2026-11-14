import type { CleMatiere } from '@/lib/matieres';

/**
 * Lot 11 : ce que servent App\Services\Organisation\SuiviService et les
 * contrôleurs des espaces parent, enseignant et établissement.
 */

export type Identite = { id: number; prenom: string; pseudo: string };

export type NotionFaible = {
    notion_id: number;
    notion: string;
    chapitre: string;
    matiere: string;
    cle: CleMatiere;
    moyenne: number;
    travaillee_par: number;
    fragiles: number;
    jamais: number;
};

export type ResumeGroupe = {
    id: number;
    nom: string;
    code: string;
    examen: string;
    etablissement: string | null;
    archive: boolean;
    eleves: number;
    est_exemple: boolean;
};

export type ResumeDevoir = {
    id: number;
    titre: string;
    echeance_le: string;
    echu: boolean;
    questions: number;
    est_exemple: boolean;
};

export type EtatDevoir = {
    etat: 'a_faire' | 'en_cours' | 'rendu';
    en_retard: boolean;
    reponses: number;
    score: number | null;
    rendu_le: string | null;
};

export type SuiviGroupe = {
    groupe: ResumeGroupe;
    resume: {
        eleves: number;
        jauge_moyenne: number | null;
        actifs_semaine: number;
        devoirs_ouverts: number;
    };
    notions_faibles: NotionFaible[];
    eleves: (Identite & {
        jauge: number;
        actif_semaine: boolean;
        derniere_activite: string | null;
        devoirs_rendus: number;
    })[];
    devoirs: (ResumeDevoir & { rendus: number; en_cours: number })[];
};

export type Licence = {
    id: number;
    places: number;
    prises: number;
    debut: string;
    fin: string;
    en_cours: boolean;
    reference: string | null;
    est_exemple: boolean;
};

export type EtatAbonnement = {
    abonne: boolean;
    formule: string | null;
    debut: string | null;
    fin: string | null;
    jours_restants: number | null;
    est_exemple: boolean;
};

export type SuiviEnfant = {
    eleve: Identite;
    examen: string | null;
    objectif_minutes: number | null;
    jauge: {
        pourcentage: number;
        matieres: { cle: CleMatiere; maitrise: number }[];
    } | null;
    matieres: {
        cle: CleMatiere;
        nom: string;
        maitrise: number;
        notions: number;
        maitrisees: number;
    }[];
    semaine: {
        date: string;
        minutes: number;
        reponses: number;
        objectif: boolean;
    }[];
    minutes_semaine: number;
    minutes_semaine_precedente: number;
    serie: number;
    examens_blancs: {
        uuid: string;
        titre: string;
        session: string;
        matiere: { cle: CleMatiere; nom: string };
        note: number;
        termine_le: string;
        est_exemple: boolean;
    }[];
    abonnement: EtatAbonnement;
};

/** Mot de passe provisoire d'un compte du personnel ouvert à l'instant (montré une fois). */
export type MotDePasseProvisoire = {
    prenom: string;
    mot_de_passe: string;
} | null;
