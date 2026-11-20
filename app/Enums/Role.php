<?php

namespace App\Enums;

/**
 * Les rôles de PLAN § 4. Les permissions de chaque rôle sont décidées ici et
 * seulement ici ; RolesEtPermissionsSeeder les recopie en base.
 */
enum Role: string
{
    case Eleve = 'eleve';
    case Parent = 'parent';
    case Enseignant = 'enseignant';
    case Redacteur = 'redacteur';
    case Relecteur = 'relecteur';
    case AdminContenu = 'admin_contenu';
    case GestionnaireEtablissement = 'gestionnaire_etablissement';
    case Superadmin = 'superadmin';

    public function libelle(): string
    {
        return match ($this) {
            self::Eleve => 'Élève',
            self::Parent => 'Parent',
            self::Enseignant => 'Enseignant',
            self::Redacteur => 'Rédacteur',
            self::Relecteur => 'Relecteur',
            self::AdminContenu => 'Responsable pédagogique',
            self::GestionnaireEtablissement => "Gestionnaire d'établissement",
            self::Superadmin => 'Administrateur plateforme',
        };
    }

    /**
     * Rôles du back-office contenu et de la console : double authentification
     * proposée (DA4) et session limitée à 12 h (HL-D10).
     *
     * Lot 11 (décision 4) : l'enseignant et le gestionnaire d'établissement
     * en sont aussi — ils voient les données de nombreux mineurs. Le parent
     * garde la session de 30 jours des élèves.
     */
    public function estPersonnel(): bool
    {
        return match ($this) {
            self::Redacteur, self::Relecteur, self::AdminContenu, self::Superadmin,
            self::Enseignant, self::GestionnaireEtablissement => true,
            default => false,
        };
    }

    /**
     * @return list<Permission>
     */
    public function permissions(): array
    {
        $permissions = match ($this) {
            self::Eleve => [
                Permission::EspaceEleve,
                Permission::SouscrireAbonnement,
                Permission::UtiliserTuteur,
                Permission::RejoindreGroupe,
                Permission::InviterParent,
                Permission::ParticiperCommunaute,
                // Lot 14 : la file d'opérations ne tourne que pour l'élève (HORS_LIGNE.md A.2).
                Permission::DiagnostiquerAppareil,
            ],
            // Lot 11 : le parent paie aussi l'abonnement de ses enfants.
            self::Parent => [Permission::EspaceParent, Permission::SouscrireAbonnement],
            self::Enseignant => [Permission::EspaceEnseignant, Permission::GererGroupes, Permission::ModererCommunaute],
            self::GestionnaireEtablissement => [Permission::EspaceEtablissement, Permission::GererEtablissement],
            self::Redacteur => [Permission::EspaceContenu, Permission::RedigerContenu, Permission::ImporterAnnales],
            // Le relecteur juge le contenu signalé ; il répond aux élèves.
            self::Relecteur => [Permission::EspaceContenu, Permission::RelireContenu, Permission::TraiterSignalements],
            self::AdminContenu, self::Superadmin => [
                Permission::EspaceContenu,
                Permission::GererReferentiel,
                Permission::RedigerContenu,
                Permission::RelireContenu,
                Permission::AdministrerContenu,
                Permission::ImporterAnnales,
                Permission::TraiterSignalements,
                Permission::LireJournalTuteur,
                ...($this === self::Superadmin ? [Permission::EspaceConsole, Permission::GererCodes, Permission::VoirPaiements, Permission::VoirCoutsTuteur, Permission::AdministrerEtablissements, Permission::VoirImpact, Permission::LireJournalAcces, Permission::AdministrerComptes, Permission::ConsoleTerrain] : []),
            ],
        };

        if ($this->estPersonnel()) {
            $permissions[] = Permission::DoubleAuthentification;
        }

        return $permissions;
    }
}
