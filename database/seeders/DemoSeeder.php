<?php

namespace Database\Seeders;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use RuntimeException;

/**
 * Un compte de démonstration par rôle (développement seulement), connexion
 * par téléphone : +224 600 00 00 01 à 09, dans l'ordre de COMPTES.
 *
 * `firstOrCreate` : un nouveau `db:seed` ne réinitialise jamais un mot de
 * passe (CLAUDE.md § 4). Mot de passe lu dans `.env` (DEMO_MOT_DE_PASSE,
 * par config/demonstration.php), jamais écrit dans le dépôt.
 */
class DemoSeeder extends Seeder
{
    /** @var list<array{telephone: string, prenom: string, pseudo: string, role: Role}> */
    public const COMPTES = [
        ['telephone' => '+224600000001', 'prenom' => 'Aïssatou', 'pseudo' => 'aissatou_demo', 'role' => Role::Eleve],
        ['telephone' => '+224600000002', 'prenom' => 'Mamadou', 'pseudo' => 'parent_demo', 'role' => Role::Parent],
        ['telephone' => '+224600000003', 'prenom' => 'Fatoumata', 'pseudo' => 'enseignante_demo', 'role' => Role::Enseignant],
        ['telephone' => '+224600000004', 'prenom' => 'Ibrahima', 'pseudo' => 'redacteur_demo', 'role' => Role::Redacteur],
        ['telephone' => '+224600000005', 'prenom' => 'Kadiatou', 'pseudo' => 'relectrice_demo', 'role' => Role::Relecteur],
        ['telephone' => '+224600000006', 'prenom' => 'Alpha', 'pseudo' => 'pedagogie_demo', 'role' => Role::AdminContenu],
        ['telephone' => '+224600000007', 'prenom' => 'Mariama', 'pseudo' => 'etablissement_demo', 'role' => Role::GestionnaireEtablissement],
        ['telephone' => '+224600000008', 'prenom' => 'Sékou', 'pseudo' => 'plateforme_demo', 'role' => Role::Superadmin],
        // Second élève (lot 2) : Bac SE, rien encore de fait.
        ['telephone' => '+224600000009', 'prenom' => 'Ousmane', 'pseudo' => 'ousmane_demo', 'role' => Role::Eleve],
    ];

    public function run(): void
    {
        if (app()->isProduction()) {
            throw new RuntimeException('Les comptes de démonstration ne sont jamais créés en production.');
        }

        $motDePasse = config('demonstration.mot_de_passe');

        if (! is_string($motDePasse) || strlen($motDePasse) < 8) {
            throw new RuntimeException('Renseigner DEMO_MOT_DE_PASSE (8 caractères au moins) dans .env.');
        }

        foreach (self::COMPTES as $compte) {
            $user = User::firstOrCreate(
                ['telephone' => $compte['telephone']],
                [
                    'prenom' => $compte['prenom'],
                    'pseudo' => $compte['pseudo'],
                    'password' => $motDePasse,
                ],
            );

            $user->forceFill(['telephone_verifie_le' => $user->telephone_verifie_le ?? now()])->save();
            $user->syncRoles([$compte['role']]);
        }

        // Leçons fictives, écrites et relues par ces comptes (lot 1), puis le
        // cours côté élève et les profils d'examen des élèves (lot 2).
        $this->call([DemoContenuSeeder::class, DemoCoursSeeder::class, DemoEleveSeeder::class]);
    }
}
