<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
    {
        Schema::create('invoice_settings', function (Blueprint $table) {
            $table->id();
            $table->boolean('show_logo')->default(true);
            $table->boolean('show_watermark')->default(true);
            $table->boolean('show_client_info')->default(true);
            $table->boolean('show_invoice_meta')->default(true);
            $table->boolean('show_notes')->default(true);
            $table->boolean('show_bank_info')->default(true);
            $table->boolean('show_signature')->default(true);
            $table->boolean('show_seal')->default(false);
            $table->boolean('show_footer')->default(true);
            $table->text('bank_details')->nullable();
            $table->text('footer_text')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('invoice_settings');
    }
};
