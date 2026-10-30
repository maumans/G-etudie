<?php

namespace App\Enums;

use App\Models\User;

/**
 * Les trois espaces connectés (DESIGN.md § 7) et la seule réponse à « où
 * arrive ce compte ? ». Les cas sont rangés par priorité : un compte qui
 * ouvre plusieurs espaces arrive dans le premier (l'administrateur
 * plateforme dans la console).
 */
enum Espace: string
{
    case Console = 'console';
    case Contenu = 'contenu';
    case Eleve = 'eleve';

    public function permission(): Permission
    {
        return match ($this) {
            self::Console => Permission::EspaceConsole,
            self::Contenu => Permission::EspaceContenu,
            self::Eleve => Permission::EspaceEleve,
        };
    }

    public function routeAccueil(): string
    {
        return $this->value.'.accueil';
    }

    /**
     * @return list<self>
     */
    public static function accessiblesA(User $user): array
    {
        return array_values(array_filter(
            self::cases(),
            fn (self $espace) => $user->can($espace->permission()->value),
        ));
    }

    /** L'espace où le compte arrive ; `null` s'il n'en ouvre aucun (« Mon compte » seulement). */
    public static function principalDe(User $user): ?self
    {
        return self::accessiblesA($user)[0] ?? null;
    }

    /** Adresse d'arrivée après connexion. */
    public static function accueilDe(User $user): string
    {
        $espace = self::principalDe($user);

        return route($espace?->routeAccueil() ?? 'compte.profil.edit', absolute: false);
    }
}
