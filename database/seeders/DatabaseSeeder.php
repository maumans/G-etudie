<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Lancé à chaque déploiement, après `migrate` (CLAUDE.md § 4) : les
     * référentiels partout, les comptes de démonstration hors production
     * seulement.
     */
    public function run(): void
    {
        $this->call(RolesEtPermissionsSeeder::class);

        if (! app()->isProduction()) {
            $this->call(DemoSeeder::class);
        }
    }
}
