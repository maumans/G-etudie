/**
 * Ce que l'élève lit dans « À envoyer » et « À corriger » pour chaque type
 * d'opération. Chaque type inscrit dans RegistreOperations::TYPES (serveur)
 * a son libellé ici (HORS_LIGNE.md A.3.6, « brancher un type », point 5).
 */
export const LIBELLES: Record<string, string> = {
    'tentative.enregistrer': 'Réponse à une question',
    'tentative.auto_evaluer': 'Auto-évaluation d’une rédaction',
    'seance.terminer': 'Fin de séance',
    'lecon.progression': 'Progression dans une leçon',
};

export function libelleOperation(type: string): string {
    return LIBELLES[type] ?? 'Réponse';
}

/** « 1 réponse », « 12 réponses ». */
export function nombreDeReponses(nombre: number): string {
    return `${nombre} réponse${nombre > 1 ? 's' : ''}`;
}
