<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class SuperAdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $role = Role::firstOrCreate(['name' => 'Super Admin']);

        $user = User::updateOrCreate(
            ['email' => 'superadmin@unibox.com'],
            [
                'name'     => 'Super Admin',
                'password' => Hash::make('uniboxoffice123456'),
            ]
        );

        if (!$user->hasRole('Super Admin')) {
            $user->assignRole($role);
        }
    }
}
