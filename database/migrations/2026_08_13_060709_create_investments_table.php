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
        Schema::create('investments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('investor_id');
            $table->unsignedBigInteger('account_id');
            $table->enum('investment_type', ['equity', 'loan'])->default('loan')->comment('equity=বিনিয়োগ, loan=ধার');
            $table->decimal('amount', 15, 2)->comment('কত টাকা ব্যবসায় ঢুকলো');
            $table->date('date');
            $table->string('purpose')->nullable();
            $table->text('note')->nullable();
            $table->enum('status', ['active', 'fully_paid'])->default('active'); 
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('investments');
    }
};
