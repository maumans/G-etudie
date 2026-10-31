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
     * Parent, enseignant et gestionnaire n'ont pas encore d'espace (lot 11) :
     * leur session suit celle des élèves jusque-là (DEVBOOK, points ouverts).
     */
    public function estPersonnel(): bool
    {
        return match ($this) {
            self::Redacteur, self::Relecteur, self::AdminContenu, self::Superadmin => true,
            default => false,
        };
    }

    /**
     * @return list<Permission>
     */
    public function permissions(): array
    {
        $permissions = match ($this) {
            self::Eleve => [Permission::EspaceEleve],
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
                ...($this === self::Superadmin ? [Permission::EspaceConsole] : []),
            ],
            // Leurs espaces arrivent au lot 11 : d'ici là, « Mon compte » seulement.
            self::Parent, self::Enseignant, self::GestionnaireEtablissement => [],
        };

        if ($this->estPersonnel()) {
            $permissions[] = Permission::DoubleAuthentification;
        }

        return $permissions;
    }
}
