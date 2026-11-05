/**
 * La note d'un examen blanc sur 20 — jumelle de `App\Support\NoteExamen`
 * (même jeu d'exemples : `tests/fixtures/notes-examen.json`). Sur l'appareil,
 * elle ne sert qu'à **afficher** le résultat tout de suite : la note du
 * serveur fait foi (HORS_LIGNE.md A.8).
 *
 * Une partie vaut son barème imprimé ; si une partie n'en a pas, toutes
 * pèsent autant. Une question sans réponse, ou ouverte et pas auto-évaluée,
 * vaut 0.
 */
export type PartieNotee = { bareme: number | null; scores: (number | null)[] };

export type Note = {
    note: number;
    parties: { points: number; sur: number }[];
};

export function arrondir(valeur: number): number {
    return Math.floor(valeur * 100 + 0.5 + 1e-9) / 100;
}

export function noteExamen(parties: PartieNotee[]): Note {
    const comptees = parties.filter((p) => p.scores.length > 0);
    const avecBareme =
        comptees.length > 0 &&
        comptees.every((p) => typeof p.bareme === 'number' && p.bareme > 0);

    let possibles = 0;
    let obtenus = 0;
    const details = parties.map((partie) => {
        if (partie.scores.length === 0) {
            return { points: 0, sur: 0 };
        }

        const poids = avecBareme ? (partie.bareme as number) : 1;
        const part =
            partie.scores.reduce<number>(
                (total, s) => total + Math.max(0, Math.min(100, s ?? 0)),
                0,
            ) /
            (100 * partie.scores.length);

        possibles += poids;
        obtenus += poids * part;

        return { points: arrondir(poids * part), sur: poids };
    });

    return {
        note: possibles > 0 ? arrondir((20 * obtenus) / possibles) : 0,
        parties: details,
    };
}

/** « 12,5 », « 14 », « 9,75 » : une note à la française. */
export function formaterNote(note: number): string {
    return note.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
}
