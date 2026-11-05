<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * Ce que toute base doit avoir, production comme tests : rôles et
 * permissions, catalogue des badges. Semé une fois par `Tests\TestCase`.
 */
class SocleSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([RolesEtPermissionsSeeder::class, BadgeSeeder::class]);
    }
}
