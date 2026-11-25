<?php

namespace App\Console\Commands;

use App\Enums\Role;
use App\Services\Plateforme\ComptesService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Validation\ValidationException;

/**
 * Ouvre un compte du personnel (ou d'un parent) avec un mot de passe
 * provisoire montré **une seule fois** (MISE_EN_PRODUCTION.md § 3, étape
 * 12). Aucun mot de passe sur la ligne de commande : rien ne traîne dans
 * l'historique du serveur ni de Laravel Cloud.
 *
 *     php artisan compte:creer superadmin 620000000 Maurice
 */
#[Signature('compte:creer
    {role : superadmin, admin_contenu, redacteur, relecteur ou parent}
    {telephone : le numéro, 9 chiffres (6xx xx xx xx), +224 facultatif}
    {prenom : le prénom affiché}')]
#[Description('Ouvre un compte (personnel ou parent) avec un mot de passe provisoire montré une seule fois')]
class CreerCompte extends Command
{
    public function handle(ComptesService $comptes): int
    {
        $role = Role::tryFrom((string) $this->argument('role'));

        if ($role === null) {
            $this->error('Rôle inconnu. Rôles possibles : '.implode(', ', array_map(
                fn (Role $r) => $r->value,
                ComptesService::ROLES_OUVERTS_PAR_L_ADMINISTRATEUR,
            )).'.');

            return self::FAILURE;
        }

        try {
            $resultat = $comptes->ouvrir($role, (string) $this->argument('telephone'), (string) $this->argument('prenom'));
        } catch (ValidationException $exception) {
            $this->error((string) collect($exception->errors())->flatten()->first());

            return self::FAILURE;
        }

        $user = $resultat['user'];
        $this->info("Compte ouvert : {$user->prenom} ({$role->libelle()}), n° {$user->id}.");
        $this->line("Numéro de connexion : {$user->telephone}");
        $this->line("Pseudo : {$user->pseudo}");
        $this->line('Mot de passe provisoire : '.$resultat['mot_de_passe']);
        $this->newLine();
        $this->warn('Ce mot de passe ne sera plus jamais affiché. À la première connexion : « Mon compte › Mot de passe » pour le changer'
            .($role->estPersonnel() ? ', puis « Mon compte › Sécurité » pour activer la double authentification.' : '.'));

        return self::SUCCESS;
    }
}
