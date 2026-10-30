import type { CleMatiere } from '@/lib/matieres';

/** App\Enums\StatutContenu. */
export type StatutContenu = 'brouillon' | 'en_relecture' | 'publie' | 'archive';

/** Une leçon telle que LeconController::presenter la décrit. */
export type LeconResume = {
    uuid: string;
    titre: string;
    statut: StatutContenu;
    /** Une version est en ligne (même pendant un nouveau brouillon). */
    publiee: boolean;
    est_exemple: boolean;
    auteur: string;
    de_moi: boolean;
    modifiee_le: string;
    matiere: { nom: string; teinte: CleMatiere };
    classe: string;
    chapitre: string;
    notion: string;
};
