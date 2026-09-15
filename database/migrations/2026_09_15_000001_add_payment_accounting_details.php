<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_expenses', function (Blueprint $table) {
            $table->string('payee_name')->nullable();
            $table->decimal('bank_charge', 15, 2)->default(0);
            $table->decimal('payment_amount', 15, 2)->nullable();
            $table->decimal('advance_amount', 15, 2)->nullable();
        });
        Schema::table('expenses', fn (Blueprint $table) => $table->decimal('bank_charge', 15, 2)->default(0));
        Schema::table('salaries', fn (Blueprint $table) => $table->decimal('advance_deduction', 12, 2)->default(0));
        Schema::table('transactions', fn (Blueprint $table) => $table->decimal('bank_charge', 15, 2)->default(0));
        Schema::table('vendor_payments', fn (Blueprint $table) => $table->decimal('bank_charge', 15, 2)->default(0));
        Schema::table('vendor_ledgers', function (Blueprint $table) {
            $table->date('date')->nullable();
            $table->unsignedBigInteger('transaction_id')->nullable()->index();
        });
        Schema::create('advance_settlements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('advance_id')->constrained()->restrictOnDelete();
            $table->morphs('settleable');
            $table->decimal('amount', 15, 2);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('advance_settlements');
        Schema::table('vendor_ledgers', fn (Blueprint $table) => $table->dropColumn(['date', 'transaction_id']));
        Schema::table('vendor_payments', fn (Blueprint $table) => $table->dropColumn('bank_charge'));
        Schema::table('transactions', fn (Blueprint $table) => $table->dropColumn('bank_charge'));
        Schema::table('expenses', fn (Blueprint $table) => $table->dropColumn('bank_charge'));
        Schema::table('salaries', fn (Blueprint $table) => $table->dropColumn('advance_deduction'));
        Schema::table('project_expenses', fn (Blueprint $table) => $table->dropColumn(['payee_name', 'bank_charge', 'payment_amount', 'advance_amount']));
    }
};
