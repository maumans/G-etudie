<?php

namespace Database\Seeders;

use App\Enums\Permission;
use App\Enums\Role;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission as ModelePermission;
use Spatie\Permission\Models\Role as ModeleRole;
use Spatie\Permission\PermissionRegistrar;

/**
 * Recopie en base les rôles et permissions décidés dans App\Enums\Role et
 * App\Enums\Permission. Idempotent : lancé à chaque déploiement, après
 * `migrate` (CLAUDE.md § 4), y compris en production.
 *
 * Une permission retirée de l'énumération est supprimée : la base ne garde
 * jamais un droit que le code ne connaît plus.
 */
class RolesEtPermissionsSeeder extends Seeder
{
    private const GARDE = 'web';

    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $noms = array_map(fn (Permission $permission) => $permission->value, Permission::cases());

        foreach ($noms as $nom) {
            ModelePermission::findOrCreate($nom, self::GARDE);
        }

        ModelePermission::query()->whereNotIn('name', $noms)->delete();

        foreach (Role::cases() as $role) {
            ModeleRole::findOrCreate($role->value, self::GARDE)
                ->syncPermissions(array_map(fn (Permission $permission) => $permission->value, $role->permissions()));
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
