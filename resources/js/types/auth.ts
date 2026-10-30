/**
 * Le compte connecté tel que le partage HandleInertiaRequests : données
 * minimales (PLAN § 10), jamais le numéro de téléphone.
 */
export type User = {
    id: number;
    prenom: string;
    pseudo: string;
    numero_verifie: boolean;
};

export type Auth = {
    user: User | null;
};
