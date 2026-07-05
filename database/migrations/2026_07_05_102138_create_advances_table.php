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
        Schema::create('advances', function (Blueprint $table) {
            $table->id();
            $table->string('given_to')->comment('যাকে অ্যাডভান্স দেওয়া হলো');
            $table->decimal('amount', 15, 2)->comment('কত টাকা দেওয়া হলো');
            $table->date('date');
            $table->string('purpose')->nullable()->comment('অফিসের কাজ নাকি অন্য কিছু');
            $table->string('status')->default('unsettled')->comment('unsettled, settled');
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('logged_by')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('advances');
    }
};
