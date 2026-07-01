<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Illuminate\Support\Facades\Hash;

class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        Permission::create(['name' => 'view finance']);
        Permission::create(['name' => 'manage users']);

        $superAdminRole = Role::create(['name' => 'Super Admin']);
        
        $managerRole = Role::create(['name' => 'Manager']);
        $managerRole->givePermissionTo('view finance'); 

        $superAdmin = User::create([
            'name' => 'Super Admin',
            'email' => 'superadmin@gmail.com',
            'password' => Hash::make('12345678'), 
        ]);

        $superAdmin->assignRole($superAdminRole);
    }
}
