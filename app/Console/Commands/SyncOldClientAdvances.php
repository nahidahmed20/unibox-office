<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\ClientAdvance;
use App\Models\Transaction;

class SyncOldClientAdvances extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'sync:old-client-advances';

    /**
     * The console command description.
     */
    protected $description = 'Sync old client advances to the transactions table';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting to sync old client advances...');

        $advances = ClientAdvance::whereNotNull('account_id')->get();
        $count = 0;

        foreach ($advances as $advance) {
            // চেক করুন এই অ্যাডভান্সের ট্রানজেকশন আগে থেকেই আছে কি না (যাতে ডুপ্লিকেট না হয়)
            $exists = Transaction::where('transactionable_type', ClientAdvance::class)
                ->where('transactionable_id', $advance->id)
                ->exists();

            if (!$exists) {
                Transaction::create([
                    'account_id'           => $advance->account_id,
                    'type'                 => 'credit', // ক্লায়েন্ট অ্যাডভান্স দিলে টাকা অ্যাকাউন্টে ঢোকে, তাই credit
                    'amount'               => $advance->amount,
                    'transaction_date'     => $advance->date,
                    'description'          => 'Client Advance Received. ' . ($advance->note ? ' Note: ' . $advance->note : ''),
                    'transactionable_id'   => $advance->id,
                    'transactionable_type' => ClientAdvance::class,
                ]);
                $count++;
            }
        }

        $this->info("Successfully synced {$count} old client advances to the transactions table!");
    }
}
