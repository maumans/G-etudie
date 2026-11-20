import type { CleMatiere } from '@/lib/matieres';

/** Les chiffres de la console plateforme (lot 13), tels que PlateformeService les donne. */

export type Retention = {
    taux: number | null;
    cohorte: number;
    revenus: number;
};

export type Activite = {
    actifs: {
        jour: number;
        semaine: number;
        mois: number;
        semaine_precedente: number;
    };
    inscrits: number;
    nouveaux_semaine: number;
    retention: { j7: Retention; j30: Retention };
    semaines: {
        semaine: string;
        actifs: number;
        seances: number;
        examens_blancs: number;
        assidus: number;
    }[];
    par_examen: {
        cle: string;
        libelle: string;
        actifs: number;
        inscrits: number;
    }[];
    rythme: { aucune: number; une_ou_deux: number; assidus: number };
    est_exemple: boolean;
};

export type LigneCouverture = {
    matiere: { nom: string; teinte: CleMatiere };
    classe: string;
    examens: string[];
    chapitres: number;
    notions: number;
    couvertes: number;
};

export type ContenuPlateforme = {
    couverture: LigneCouverture[];
    lecons: Record<'brouillon' | 'en_relecture' | 'publie' | 'archive', number>;
    en_relecture: { lecons: number; questions: number; annales: number };
    publies: { lecons: number; questions: number; annales: number };
    imports_en_cours: number;
    signalements: {
        ouverts: number;
        ouverts_depuis_7_jours: number;
        traites_90_jours: number;
        delai_median_heures: number | null;
    };
    est_exemple: boolean;
};

export type Revenus = {
    montant_30_jours: number;
    montant_30_jours_precedents: number;
    paiements_30_jours: number;
    echecs_30_jours: number;
    abonnes: number;
    eleves: number;
    abonnes_par_source: { cle: string; libelle: string; abonnes: number }[];
    par_moyen: {
        cle: string;
        libelle: string;
        montant_gnf: number;
        paiements: number;
    }[];
    par_formule: {
        cle: string;
        libelle: string;
        montant_gnf: number;
        paiements: number;
    }[];
    codes: { emis: number; utilises: number; utilises_30_jours: number };
    semaines: { semaine: string; montant_gnf: number; codes: number }[];
    est_exemple: boolean;
};

export type Evolution = {
    mesures: number;
    debut: number | null;
    fin: number | null;
    ecart: number | null;
    en_progres: number | null;
};

export type GroupeImpact = {
    eleves: number;
    jauge: Evolution;
    examens_blancs: Evolution;
};

export type Impact = {
    filtres: {
        semaines: number;
        examen: string | null;
        etablissement: number | null;
    };
    periode: { debut: string; fin: string };
    eleves: number;
    assidus: GroupeImpact;
    autres: GroupeImpact;
    courbe: {
        semaine: string;
        assidus: number | null;
        autres: number | null;
    }[];
    releves: { premiere_semaine: string | null; semaines_relevees: number };
    methode: {
        seances_par_semaine: number;
        semaines_minimum: number;
        seuil: number;
    };
    libelles: { examen: string; etablissement: string };
    est_exemple: boolean;
};

/** Écart en pour cent d'une valeur à la précédente ; rien si la précédente est nulle. */
export function variation(actuel: number, precedent: number): number | null {
    if (precedent === 0) {
        return null;
    }

    return Math.round((100 * (actuel - precedent)) / precedent);
}
