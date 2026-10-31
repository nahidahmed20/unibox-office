<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        Permission::firstOrCreate(['name' => 'view_finance']);
        Permission::firstOrCreate(['name' => 'manage_users']);

        Role::firstOrCreate(['name' => 'Super Admin']);
        
        $managerRole = Role::firstOrCreate(['name' => 'Manager']);
        $managerRole->givePermissionTo('view_finance');

        $this->call(SuperAdminSeeder::class);
    }
}
