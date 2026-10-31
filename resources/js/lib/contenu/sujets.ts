import type { DocumentBlocs } from '@/lib/contenu/blocs';
import type { QuestionEleve } from '@/lib/contenu/questions';
import type { CleMatiere } from '@/lib/matieres';

/**
 * Une annale telle que l'élève la reçoit (`App\Support\PresentationSujet`) :
 * la version publiée de la structure, et la version publiée de chaque
 * question. Un objet de contenu (HORS_LIGNE.md A.4) : l'écran ne sait pas
 * s'il vient des props ou d'un pack (lot 7).
 */
export type SujetEleve = {
    type: 'sujet';
    uuid: string;
    version: number;
    titre: string;
    origine: 'officiel' | 'blanc_maison';
    session: number;
    libelle_session: string;
    examen: string;
    serie: string | null;
    matiere: { cle: CleMatiere; nom: string; slug: string };
    duree_minutes: number | null;
    coefficient: string | null;
    est_exemple: boolean;
    document: {
        type: string | null;
        octets: number | null;
        url: string;
    } | null;
    parties: PartieSujet[];
};

export type PartieSujet = {
    uuid: string;
    titre: string;
    bareme: number | null;
    consigne: DocumentBlocs;
    questions: QuestionEleve[];
};

/** Les questions dans l'ordre du sujet, chacune avec sa partie. */
export function questionsDuSujet(
    sujet: SujetEleve,
): { question: QuestionEleve; partie: PartieSujet; numero: number }[] {
    let numero = 0;

    return sujet.parties.flatMap((partie) =>
        partie.questions.map((question) => ({
            question,
            partie,
            numero: ++numero,
        })),
    );
}

/** « 1,2 Mo », « 350 Ko » : le poids annoncé avant d'ouvrir un document. */
export function formaterPoids(octets: number | null): string {
    if (octets === null || octets <= 0) {
        return '';
    }

    if (octets < 1024 * 1024) {
        return `${Math.max(1, Math.round(octets / 1024))} Ko`;
    }

    return `${(octets / (1024 * 1024)).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Mo`;
}

/** « 4 h », « 2 h 30 », « 45 min ». */
export function formaterDuree(minutes: number | null): string | null {
    if (minutes === null) {
        return null;
    }

    const heures = Math.floor(minutes / 60);
    const reste = minutes % 60;

    if (heures === 0) {
        return `${reste} min`;
    }

    return reste === 0
        ? `${heures} h`
        : `${heures} h ${String(reste).padStart(2, '0')}`;
}
