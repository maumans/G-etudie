/** Les espaces connectés, dans l'ordre de App\Enums\Espace. */
export type Espace =
    | 'console'
    | 'contenu'
    | 'etablissement'
    | 'enseignant'
    | 'parent'
    | 'eleve';

/**
 * Le compte connecté tel que le partage HandleInertiaRequests : données
 * minimales (PLAN § 10), jamais le numéro de téléphone.
 */
export type User = {
    id: number;
    prenom: string;
    pseudo: string;
    numero_verifie: boolean;
    /** Espace d'arrivée ; `null` : « Mon compte » seulement (compte sans espace). */
    espace: Espace | null;
    /** Espaces que le compte peut ouvrir. */
    espaces: Espace[];
    /** Double authentification proposée (personnel, DA4). */
    double_authentification: boolean;
    /** Permissions du compte (App\Enums\Permission) : pour taire ce qui ne le concerne pas. */
    permissions: Permission[];
};

/** Les valeurs de App\Enums\Permission. */
export type Permission =
    | 'espace.eleve'
    | 'espace.contenu'
    | 'espace.console'
    | 'referentiel.gerer'
    | 'contenu.rediger'
    | 'contenu.relire'
    | 'contenu.administrer'
    | 'annales.importer'
    | 'signalements.traiter'
    | 'abonnement.souscrire'
    | 'codes.gerer'
    | 'paiements.voir'
    | 'tuteur.utiliser'
    | 'tuteur.journal'
    | 'tuteur.couts'
    // Lot 11.
    | 'espace.parent'
    | 'espace.enseignant'
    | 'espace.etablissement'
    | 'groupes.gerer'
    | 'groupes.rejoindre'
    | 'parents.inviter'
    | 'etablissement.gerer'
    | 'etablissements.administrer'
    | 'communaute.participer'
    | 'communaute.moderer'
    // Lot 13.
    | 'console.impact'
    | 'console.journal'
    | 'comptes.administrer'
    | 'compte.double_authentification';

export type Auth = {
    user: User | null;
};
