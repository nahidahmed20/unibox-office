<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Advance;
use App\Models\Transaction;

class SyncOldAdvances extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'sync:old-advances';

    /**
     * The console command description.
     */
    protected $description = 'Sync old employee advances to the transactions table';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting to sync old advances...');

        // Find advances that were paid from an account
        $advances = Advance::whereNotNull('account_id')->get();
        $count = 0;

        foreach ($advances as $advance) {
            // Check if transaction already exists to avoid duplicates
            $exists = Transaction::where('transactionable_type', Advance::class)
                ->where('transactionable_id', $advance->id)
                ->exists();

            if (!$exists) {
                Transaction::create([
                    'account_id'           => $advance->account_id,
                    'type'                 => 'debit', // Advance disbursement reduces balance
                    'amount'               => $advance->amount,
                    'transaction_date'     => $advance->date,
                    'description'          => 'Employee Advance: ' . ($advance->purpose ?? 'Office Purpose'),
                    'transactionable_id'   => $advance->id,
                    'transactionable_type' => Advance::class,
                ]);
                $count++;
            }
        }

        $this->info("Successfully synced {$count} old advances to the transactions table!");
    }
}
