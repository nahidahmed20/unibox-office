<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('invoice_items') && !Schema::hasColumn('invoice_items', 'unit_type')) {
            Schema::table('invoice_items', function (Blueprint $table) {
                $table->string('unit_type', 50)->nullable()->default('piece')->after('quantity');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('invoice_items') && Schema::hasColumn('invoice_items', 'unit_type')) {
            Schema::table('invoice_items', function (Blueprint $table) {
                $table->dropColumn('unit_type');
            });
        }
    }
};

