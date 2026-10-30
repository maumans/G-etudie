/** Les espaces connectés, dans l'ordre de App\Enums\Espace. */
export type Espace = 'console' | 'contenu' | 'eleve';

/**
 * Le compte connecté tel que le partage HandleInertiaRequests : données
 * minimales (PLAN § 10), jamais le numéro de téléphone.
 */
export type User = {
    id: number;
    prenom: string;
    pseudo: string;
    numero_verifie: boolean;
    /** Espace d'arrivée ; `null` : « Mon compte » seulement (parent, enseignant… avant le lot 11). */
    espace: Espace | null;
    /** Espaces que le compte peut ouvrir. */
    espaces: Espace[];
    /** Double authentification proposée (personnel, DA4). */
    double_authentification: boolean;
};

export type Auth = {
    user: User | null;
};
