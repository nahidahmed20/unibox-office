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

        // যেসব অ্যাডভান্স অ্যাকাউন্ট থেকে দেওয়া হয়েছে, সেগুলো খুঁজে বের করা
        $advances = Advance::whereNotNull('account_id')->get();
        $count = 0;

        foreach ($advances as $advance) {
            // চেক করুন এই অ্যাডভান্সের ট্রানজেকশন আগে থেকেই আছে কি না (যাতে ডুপ্লিকেট না হয়)
            $exists = Transaction::where('transactionable_type', Advance::class)
                ->where('transactionable_id', $advance->id)
                ->exists();

            if (!$exists) {
                Transaction::create([
                    'account_id'           => $advance->account_id,
                    'type'                 => 'debit', // অ্যাডভান্স দিলে টাকা কমে, তাই debit
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
