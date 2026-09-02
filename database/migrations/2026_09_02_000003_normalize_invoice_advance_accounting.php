<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoice_advance_normalization_backups', function (Blueprint $table) {
            $table->unsignedBigInteger('invoice_id')->primary();
            $table->decimal('advance_used', 15, 2)->default(0);
            $table->timestamp('created_at')->useCurrent();
        });

        $affected = DB::table('invoices')
            ->whereIn('id', DB::table('invoice_payments')->where('method', 'Client Advance')->select('invoice_id'))
            ->where('advance_used', '>', 0)
            ->get(['id', 'advance_used']);

        if ($affected->isNotEmpty()) {
            DB::table('invoice_advance_normalization_backups')->insert(
                $affected->map(fn ($invoice) => [
                    'invoice_id' => $invoice->id,
                    'advance_used' => $invoice->advance_used,
                    'created_at' => now(),
                ])->all()
            );
        }

        DB::table('invoices')
            ->whereIn('id', DB::table('invoice_payments')->where('method', 'Client Advance')->select('invoice_id'))
            ->update(['advance_used' => 0]);
    }

    public function down(): void
    {
        if (Schema::hasTable('invoice_advance_normalization_backups')) {
            DB::table('invoice_advance_normalization_backups')->orderBy('invoice_id')->each(function ($backup) {
                DB::table('invoices')->where('id', $backup->invoice_id)->update(['advance_used' => $backup->advance_used]);
            });
            Schema::dropIfExists('invoice_advance_normalization_backups');
        }
    }
};
