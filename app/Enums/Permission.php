<?php

namespace App\Enums;

/**
 * Ce qu'un compte peut faire (PLAN § 4). Le rattachement (enfant, groupe,
 * établissement) dit sur quoi : c'est l'affaire de App\Support\Perimetre.
 *
 * Seule liste des permissions : RolesEtPermissionsSeeder crée celles-ci et
 * supprime les autres. Chaque lot ajoute les siennes ici.
 */
enum Permission: string
{
    /** Entrer dans l'espace élève (réviser, s'entraîner, examens blancs). */
    case EspaceEleve = 'espace.eleve';

    /** Entrer dans le back-office contenu. */
    case EspaceContenu = 'espace.contenu';

    /** Entrer dans la console plateforme. */
    case EspaceConsole = 'espace.console';

    /** Activer la double authentification sur son compte (DA4 : personnel seulement). */
    case DoubleAuthentification = 'compte.double_authentification';
}
