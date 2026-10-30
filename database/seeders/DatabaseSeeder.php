<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use RuntimeException;

class DatabaseSeeder extends Seeder
{
    /**
     * Compte de démonstration (développement seulement). Les comptes de démo
     * par rôle arrivent avec les rôles (lot 0, étape 5, DemoSeeder).
     *
     * `firstOrCreate` : un nouveau `db:seed` ne réinitialise jamais un mot de
     * passe (CLAUDE.md § 4). Mot de passe lu dans `.env` (DEMO_MOT_DE_PASSE,
     * par config/demonstration.php), jamais écrit dans le dépôt.
     */
    public function run(): void
    {
        if (app()->isProduction()) {
            throw new RuntimeException('Les comptes de démonstration ne sont jamais créés en production.');
        }

        $motDePasse = config('demonstration.mot_de_passe');

        if (! is_string($motDePasse) || strlen($motDePasse) < 8) {
            throw new RuntimeException('Renseigner DEMO_MOT_DE_PASSE (8 caractères au moins) dans .env.');
        }

        $eleve = User::firstOrCreate(
            ['telephone' => '+224600000001'],
            [
                'prenom' => 'Aïssatou',
                'pseudo' => 'aissatou_demo',
                'password' => $motDePasse,
            ],
        );

        $eleve->forceFill(['telephone_verifie_le' => $eleve->telephone_verifie_le ?? now()])->save();
    }
}
