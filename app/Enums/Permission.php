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

    /** Saisir le référentiel : matières, épreuves, programme, années scolaires (PLAN M3). */
    case GererReferentiel = 'referentiel.gerer';

    /** Rédiger des leçons : créer, modifier ses brouillons, les envoyer en relecture. */
    case RedigerContenu = 'contenu.rediger';

    /** Relire et publier, ou renvoyer, le contenu des autres (jamais le sien). */
    case RelireContenu = 'contenu.relire';

    /** Modifier le brouillon de n'importe quel auteur, archiver (responsable pédagogique). */
    case AdministrerContenu = 'contenu.administrer';

    /** Téléverser un sujet scanné pour l'import assisté (lot 4, PLAN M17) : l'appel à l'IA a un coût. */
    case ImporterAnnales = 'annales.importer';

    /** Lire la file des signalements des élèves et y répondre (lot 4, PLAN M17). */
    case TraiterSignalements = 'signalements.traiter';

    /** Lot 9 (PLAN M16) : s'abonner, payer par mobile money, utiliser un code prépayé. */
    case SouscrireAbonnement = 'abonnement.souscrire';

    /** Lot 9 : créer et remettre des lots de codes prépayés, en désactiver (console). */
    case GererCodes = 'codes.gerer';

    /** Lot 9 : voir les paiements de tous les comptes (assistance, console). */
    case VoirPaiements = 'paiements.voir';

    /** Lot 10 (PLAN M11) : demander une explication au tuteur N'karamögö (quota par jour). */
    case UtiliserTuteur = 'tuteur.utiliser';

    /** Lot 10 : lire le journal des échanges avec le tuteur, sans l'identité des élèves (back-office). */
    case LireJournalTuteur = 'tuteur.journal';

    /** Lot 10 : suivre l'usage et le coût du tuteur (console). */
    case VoirCoutsTuteur = 'tuteur.couts';

    /** Activer la double authentification sur son compte (DA4 : personnel seulement). */
    case DoubleAuthentification = 'compte.double_authentification';
}
