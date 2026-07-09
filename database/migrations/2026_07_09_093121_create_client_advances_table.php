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
        Schema::create('client_advances', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('client_id');
            $table->unsignedBigInteger('account_id')->comment('যে অ্যাকাউন্টে টাকা জমা হলো');
            $table->decimal('amount', 15, 2); 
            $table->decimal('used_amount', 15, 2)->default(0);
            $table->date('date');
            $table->text('note')->nullable();
            $table->boolean('is_settled')->default(false); 
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('client_advances');
    }
};
