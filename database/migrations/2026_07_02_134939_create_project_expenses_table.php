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
        Schema::create('project_expenses', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('project_id'); 
            $table->unsignedBigInteger('expense_category_id');
            $table->unsignedBigInteger('account_id')->nullable()->comment('যে অ্যাকাউন্ট থেকে টাকা খরচ হয়েছে');
            $table->string('title');
            $table->string('vendor_name')->nullable()->comment('যার সাথে চুক্তি বা যাকে টাকা দেওয়া হচ্ছে');
            $table->text('description')->nullable();
            $table->decimal('total_bill', 15, 2)->default(0)->comment('কাজের মোট চুক্তি বা বিল');
            $table->decimal('paid_amount', 15, 2)->default(0)->comment('ইতোমধ্যে কত দেওয়া হয়েছে');
            $table->decimal('due_amount', 15, 2)->default(0)->comment('বাকি কত টাকা পাবে');
            $table->decimal('amount', 15, 2)->default(0)->comment('এই এন্ট্রিতে কত টাকা খরচ দেখানো হলো');
            $table->string('payment_status')->default('due')->comment('paid, partial, or due');
            $table->date('date');
            $table->string('attachment')->nullable(); 
            $table->unsignedBigInteger('logged_by');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('project_expenses');
    }
};
