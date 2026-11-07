import type { DocumentBlocs } from '@/lib/contenu/blocs';
import type { DonneesQuestion, TypeQuestion } from '@/lib/contenu/questions';
import type { CleMatiere } from '@/lib/matieres';
import { formaterGnf } from '@/lib/utils';

/**
 * La vitrine finale (lot 8) : types des props servies par
 * `VitrineController` et `SujetPublicController`, et les petits calculs
 * qu'elles demandent (compte à rebours, tarifs, partage WhatsApp).
 */

/** Une prochaine session saisie par l'équipe (jamais devinée). */
export type SessionExamen = { examen: string; nom: string; date: string };

/** Une ligne de liste d'annale publique (`AnnalesPubliques::carte`). */
export type CarteSujet = {
    slug: string;
    titre: string;
    libelle_session: string;
    session: number;
    examen: string;
    serie: string | null;
    origine: 'officiel' | 'blanc_maison';
    matiere: { cle: CleMatiere; nom: string };
    questions: number;
    est_exemple: boolean;
};

/** Une question publique : l'énoncé, jamais la réponse ni le corrigé. */
export type QuestionPublique = {
    uuid: string;
    type: TypeQuestion;
    enonce: DocumentBlocs;
    donnees: DonneesQuestion;
    corrige_etapes: number;
};

export type SujetPublic = {
    slug: string;
    titre: string;
    origine: 'officiel' | 'blanc_maison';
    session: number;
    libelle_session: string;
    examen: string;
    examen_nom: string;
    serie: string | null;
    matiere: { cle: CleMatiere; nom: string; slug: string };
    duree_minutes: number | null;
    coefficient: string | null;
    est_exemple: boolean;
    parties: {
        uuid: string;
        titre: string;
        bareme: number | null;
        consigne: DocumentBlocs;
        questions: QuestionPublique[];
    }[];
};

export type Formule = {
    cle: string;
    nom: string;
    prix_gnf: number;
    periode: string;
    mois: number;
};

export type Tarifs = {
    gratuit: string[];
    formules: Formule[];
    abonnement: string[];
};

const JOUR = 86_400_000;

/**
 * Jours entiers entre aujourd'hui et la date de l'examen (« YYYY-MM-DD »),
 * comptés en dates du calendrier, pas en heures : le jour J vaut 0.
 */
export function joursRestants(date: string, aujourdhui: Date): number {
    const [annee, mois, jour] = date.split('-').map(Number);
    const cible = Date.UTC(annee, mois - 1, jour);
    const depart = Date.UTC(
        aujourdhui.getFullYear(),
        aujourdhui.getMonth(),
        aujourdhui.getDate(),
    );

    return Math.round((cible - depart) / JOUR);
}

/** « 22 juin 2027 » */
export function formaterDateLongue(date: string): string {
    const [annee, mois, jour] = date.split('-').map(Number);

    return new Intl.DateTimeFormat('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
    }).format(new Date(Date.UTC(annee, mois - 1, jour)));
}

/** « 10 000 GNF par mois » pour une formule de plusieurs mois, sinon null. */
export function prixMensuel(formule: Formule): string | null {
    if (formule.mois <= 1) {
        return null;
    }

    // Arrondi à la centaine : on n'affiche pas « 9 999 GNF ».
    return `${formaterGnf(Math.round(formule.prix_gnf / formule.mois / 100) * 100)} par mois`;
}

/**
 * L'économie d'une formule longue par rapport au mois payé chaque mois,
 * en pour cent entier (0 si aucune).
 */
export function economie(formule: Formule, mensuel: Formule | undefined) {
    if (!mensuel || formule.mois <= 1 || mensuel.prix_gnf <= 0) {
        return 0;
    }

    const plein = mensuel.prix_gnf * formule.mois;

    return Math.max(0, Math.round((1 - formule.prix_gnf / plein) * 100));
}

/** Le lien « Partager sur WhatsApp » (wa.me ouvre l'application). */
export function lienWhatsapp(texte: string, url: string): string {
    return `https://wa.me/?text=${encodeURIComponent(`${texte}\n${url}`)}`;
}
