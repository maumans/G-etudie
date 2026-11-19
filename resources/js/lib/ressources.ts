/**
 * Ressources externes (lot 12, PLAN M19) : ce que l'élève reçoit avec une
 * leçon (RessourceExterne::pourEleve), le même depuis un pack. Ce fichier
 * n'importe ni React ni Inertia, pour rester testable.
 */
export type RessourceEleve = {
    uuid: string;
    titre: string;
    url: string;
    domaine: string;
    site: string;
    type: 'video' | 'article' | 'encyclopedie' | 'exercices';
    type_libelle: string;
    description: string | null;
    poids_ko: number;
    duree_minutes: number | null;
    avec_suggestions: boolean;
    est_exemple: boolean;
};

/** « ≈ 900 Ko », « ≈ 8 Mo », « ≈ 1,5 Mo » : ce que le lien coûtera en données. */
export function poidsAnnonce(ko: number): string {
    if (ko < 1000) {
        return `≈ ${Math.max(1, Math.round(ko))} Ko`;
    }

    const mo = ko / 1000;
    const arrondi = mo < 10 ? Math.round(mo * 10) / 10 : Math.round(mo);

    return `≈ ${String(arrondi).replace('.', ',')} Mo`;
}

/** Les phrases du dialogue de sortie, dans l'ordre. */
export function avertissementsSortie(ressource: RessourceEleve): string[] {
    const phrases = [
        `Ce lien ouvre ${ressource.site} (${ressource.domaine}), un site qui n’est pas N’karamögö.`,
        ressource.type === 'video'
            ? `Une vidéo consomme beaucoup de données : ${poidsAnnonce(ressource.poids_ko)}${ressource.duree_minutes ? ` pour ${ressource.duree_minutes} min` : ''}. Le Wi-Fi est préférable.`
            : `Il consommera environ ${poidsAnnonce(ressource.poids_ko).replace('≈ ', '')} de données.`,
    ];

    if (ressource.avec_suggestions) {
        phrases.push(
            'Ce site propose d’autres vidéos et des publicités que notre équipe n’a pas vérifiées. Reviens ici une fois la vidéo finie.',
        );
    }

    return phrases;
}
