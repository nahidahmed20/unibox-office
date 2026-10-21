<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('invoice_advance_normalization_backups')) {
            Schema::create('invoice_advance_normalization_backups', function (Blueprint $table) {
                $table->unsignedBigInteger('invoice_id')->primary();
                $table->decimal('advance_used', 15, 2)->default(0);
                $table->timestamp('created_at')->useCurrent();
            });
        }
    }

    public function down(): void
    {
        // This table belongs to the original normalization migration. Retain any backup records.
    }
};
