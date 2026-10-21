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
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('client_id');
            $table->unsignedBigInteger('project_manager_id')->nullable()->comment('User ID of the manager');
            $table->string('title');
            $table->text('description')->nullable();
            $table->decimal('quantity', 10, 2)->nullable()->comment('e.g. 10.50, 100');
            $table->string('unit_type', 50)->nullable()->comment('e.g. kg, piece, dozen, carton');
            $table->date('start_date')->nullable();
            $table->date('deadline');
            $table->decimal('budget', 12, 2)->nullable();
            $table->enum('status', ['planning', 'in_progress', 'completed', 'on_hold'])->default('planning');
            $table->enum('priority', ['low', 'medium', 'high', 'urgent'])->default('medium');
            $table->unsignedTinyInteger('progress')->default(0)->comment('Progress in percentage 0-100');
            $table->string('repo_link')->nullable()->comment('Github/Gitlab link or Drive link');
            $table->string('live_url')->nullable()->comment('Live project URL if any');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('projects');
    }
};
