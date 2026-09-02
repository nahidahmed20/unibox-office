<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoice_payments', function (Blueprint $table) {
            $table->unsignedBigInteger('account_id')->nullable()->change();
        });

        Schema::create('invoice_payment_advance_allocations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_payment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('client_advance_id')->constrained()->restrictOnDelete();
            $table->decimal('amount', 15, 2);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_payment_advance_allocations');
        Schema::table('invoice_payments', function (Blueprint $table) {
            $table->unsignedBigInteger('account_id')->nullable(false)->change();
        });
    }
};
