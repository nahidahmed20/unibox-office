<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            if (!Schema::hasColumn('expenses', 'type')) {
                $table->string('type', 30)->default('office')->after('id')->index();
            }
            if (!Schema::hasColumn('expenses', 'client_id')) {
                $table->foreignId('client_id')->nullable()->after('expense_category_id')->constrained('clients')->nullOnDelete();
            }
            if (!Schema::hasColumn('expenses', 'sample_status')) {
                $table->string('sample_status', 30)->nullable()->default('pending')->after('date');
            }
            if (!Schema::hasColumn('expenses', 'cost_type')) {
                $table->string('cost_type', 30)->nullable()->default('company_cost')->after('sample_status');
            }
        });

        // Make expense_category_id nullable if not already
        Schema::table('expenses', function (Blueprint $table) {
            $table->unsignedBigInteger('expense_category_id')->nullable()->change();
        });

        // Migrate historical sample expense records to type = 'sample'
        DB::table('expenses')
            ->where(function ($q) {
                $q->where('title', 'like', '%sample%')
                  ->orWhere('description', 'like', '%sample%');
            })
            ->update([
                'type' => 'sample',
                'sample_status' => 'approved',
                'cost_type' => 'company_cost',
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert historical records back to office
        DB::table('expenses')->where('type', 'sample')->update(['type' => 'office']);

        Schema::table('expenses', function (Blueprint $table) {
            if (Schema::hasColumn('expenses', 'client_id')) {
                $table->dropForeign(['client_id']);
                $table->dropColumn('client_id');
            }
            if (Schema::hasColumn('expenses', 'type')) {
                $table->dropColumn('type');
            }
            if (Schema::hasColumn('expenses', 'sample_status')) {
                $table->dropColumn('sample_status');
            }
            if (Schema::hasColumn('expenses', 'cost_type')) {
                $table->dropColumn('cost_type');
            }
        });
    }
};

