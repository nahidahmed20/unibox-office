<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\VendorPayment;
use App\Models\Transaction;

class SyncOldVendorPayments extends Command
{
    protected $signature = 'sync:old-vendor-payments';
    protected $description = 'Sync old vendor payments to the transactions table';

    public function handle()
    {
        $this->info('Starting to sync old vendor payments...');

        $payments = VendorPayment::whereNotNull('account_id')
            ->where('status', 'completed')
            ->where('pay_amount', '>', 0)
            ->get();

        $count = 0;

        foreach ($payments as $payment) {
            $exists = Transaction::where('transactionable_type', VendorPayment::class)
                ->where('transactionable_id', $payment->id)
                ->exists();

            if (!$exists) {
                Transaction::create([
                    'account_id'           => $payment->account_id,
                    'type'                 => 'debit',
                    'amount'               => $payment->pay_amount,
                    'transaction_date'     => $payment->date,
                    'description'          => 'Bill payment to vendor (Auto Synced): ' . ($payment->vendor->name ?? 'Unknown') . ' (VP-' . $payment->id . ')',
                    'transactionable_id'   => $payment->id,
                    'transactionable_type' => VendorPayment::class,
                ]);
                $count++;
            }
        }

        $this->info("Successfully synced {$count} old vendor payments to the transactions table!");
    }
}
