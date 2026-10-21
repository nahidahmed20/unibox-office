<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class SchemaAuditTest extends TestCase
{
    use RefreshDatabase;

    public function test_schema_audit_uses_an_isolated_database_and_preserves_existing_records(): void
    {
        $user = User::factory()->create();
        $connection = DB::getDefaultConnection();
        $this->artisan('app:audit-schema')->assertSuccessful();
        $this->assertSame($connection, DB::getDefaultConnection());
        $this->assertDatabaseHas('users', ['id' => $user->id, 'email' => $user->email]);
    }

    public function test_schema_audit_detects_a_missing_column_without_repairing_or_changing_data(): void
    {
        $user = User::factory()->create();
        Schema::table('expenses', fn ($table) => $table->dropColumn('bank_charge'));
        $this->artisan('app:audit-schema')->expectsOutputToContain('1 missing table/column entry(s)')->assertFailed();
        $this->assertFalse(Schema::hasColumn('expenses', 'bank_charge'));
        $this->assertDatabaseHas('users', ['id' => $user->id, 'email' => $user->email]);
    }
}
