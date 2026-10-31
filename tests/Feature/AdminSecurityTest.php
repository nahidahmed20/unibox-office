<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AdminSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_regular_users_cannot_manage_access_control_or_download_backups(): void
    {
        $this->actingAs(User::factory()->create());

        $this->get(route('admin.permissions.index'))->assertForbidden();
        $this->get(route('admin.roles.index'))->assertForbidden();
        $this->get(route('admin.users.index'))->assertForbidden();
        $this->get(route('admin.backup.download'))->assertForbidden();
    }

    public function test_super_admin_can_access_access_control_pages(): void
    {
        $user = User::factory()->create();
        $user->assignRole(Role::create(['name' => 'Super Admin']));

        $this->actingAs($user)
            ->get(route('admin.roles.index'))
            ->assertOk();
    }
}
