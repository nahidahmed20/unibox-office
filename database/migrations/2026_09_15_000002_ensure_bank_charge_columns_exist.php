<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['expenses', 'project_expenses', 'transactions', 'vendor_payments'] as $tableName) {
            if (!Schema::hasColumn($tableName, 'bank_charge')) {
                Schema::table($tableName, function (Blueprint $table) {
                    $table->decimal('bank_charge', 15, 2)->default(0);
                });
            }
        }
    }

    public function down(): void
    {
        // These columns also belong to the original table definitions. Keep existing charge data.
    }
};
