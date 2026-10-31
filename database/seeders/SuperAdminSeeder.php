<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;
use RuntimeException;

class SuperAdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $role = Role::firstOrCreate(['name' => 'Super Admin']);

        $email = env('SUPER_ADMIN_EMAIL', 'superadmin@unibox.com');
        $user = User::where('email', $email)->first();

        if (!$user) {
            $password = env('SUPER_ADMIN_PASSWORD');
            if (!is_string($password) || strlen($password) < 16) {
                throw new RuntimeException('Set a unique SUPER_ADMIN_PASSWORD of at least 16 characters before creating the Super Admin account.');
            }

            $user = User::create([
                'name' => 'Super Admin',
                'email' => $email,
                'password' => Hash::make($password),
            ]);
        }

        if (!$user->hasRole('Super Admin')) {
            $user->assignRole($role);
        }
    }
}
