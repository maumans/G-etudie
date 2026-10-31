import type { DocumentBlocs } from '@/lib/contenu/blocs';

/**
 * Questions côté appareil (PLAN M5). Au lot 2, le QCM à une réponse.
 *
 * `corriger()` ne sert qu'à **répondre tout de suite** : la correction du
 * serveur fait foi (HORS_LIGNE.md A.6, `App\Support\FormatQuestion`). Les
 * deux lisent le même jeu d'exemples, `tests/fixtures/questions.json`.
 */
export type TypeQuestion = 'qcm_une';

export type OptionQcm = { id: string; texte: string; latex?: string };

export type ReponseQcm = { option: string };

/** Une question telle que la séance la reçoit (props ou pack). */
export type QuestionSeance = {
    uuid: string;
    version: number;
    type: TypeQuestion;
    enonce: DocumentBlocs;
    options: OptionQcm[];
    attendue: ReponseQcm;
    explication: DocumentBlocs | null;
    est_exemple: boolean;
    matiere: string;
    matiere_nom: string;
    notion: string;
};

export function corriger(
    type: TypeQuestion,
    attendue: Record<string, unknown>,
    reponse: Record<string, unknown>,
): boolean {
    switch (type) {
        case 'qcm_une':
            return (
                typeof reponse.option === 'string' &&
                reponse.option === attendue.option
            );
    }
}
