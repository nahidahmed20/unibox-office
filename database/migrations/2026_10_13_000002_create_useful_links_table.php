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
        if (!Schema::hasTable('useful_links')) {
            Schema::create('useful_links', function (Blueprint $table) {
                $table->id();
                $table->string('title');
                $table->text('url');
                $table->string('category')->default('General');
                $table->string('username_or_email')->nullable();
                $table->text('notes')->nullable();
                $table->boolean('is_pinned')->default(false);
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('useful_links');
    }
};

