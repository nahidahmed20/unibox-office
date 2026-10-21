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
        Schema::create('investment_payments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('investor_id');
            $table->unsignedBigInteger('investment_id')->nullable(); 
            $table->unsignedBigInteger('account_id'); 
            $table->decimal('principal_amount', 15, 2)->default(0)->comment('আসল টাকা কত ফেরত দেওয়া হলো');
            $table->decimal('profit_amount', 15, 2)->default(0)->comment('লাভ বা ইন্টারেস্ট কত দেওয়া হলো');
            $table->decimal('total_amount', 15, 2)->comment('principal + profit মোট কত ব্যাংক থেকে কাটবে');
            $table->date('payment_date');
            $table->text('note')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('investment_payments');
    }
};
