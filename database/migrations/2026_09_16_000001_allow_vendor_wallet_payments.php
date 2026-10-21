<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vendor_payments', function (Blueprint $table) {
            $table->enum('payment_source', ['account', 'advance', 'wallet'])->change();
        });
    }

    public function down(): void
    {
        if (\Illuminate\Support\Facades\DB::table('vendor_payments')->where('payment_source', 'wallet')->exists()) {
            throw new \RuntimeException('Wallet payment history must be retained; cannot remove this payment source.');
        }
        Schema::table('vendor_payments', function (Blueprint $table) {
            $table->enum('payment_source', ['account', 'advance'])->change();
        });
    }
};
