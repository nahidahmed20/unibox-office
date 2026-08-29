<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\ProjectExpense;
use App\Models\VendorPayment;
use App\Models\Transaction;

class SyncOldTransactions extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'sync:old-transactions';

    /**
     * The console command description.
     */
    protected $description = 'Sync old project expenses and vendor payments to the transactions table';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting to sync old transactions...');

        $projectExpenses = ProjectExpense::whereNotNull('account_id')->where('paid_amount', '>', 0)->get();
        $expenseCount = 0;

        foreach ($projectExpenses as $expense) {
            $exists = Transaction::where('transactionable_type', ProjectExpense::class)
                ->where('transactionable_id', $expense->id)
                ->exists();

            if (!$exists) {
                Transaction::create([
                    'account_id'           => $expense->account_id,
                    'type'                 => 'debit',
                    'amount'               => $expense->paid_amount,
                    'transaction_date'     => $expense->date,
                    'description'          => 'Project Expense (Auto Synced): ' . $expense->title,
                    'transactionable_id'   => $expense->id,
                    'transactionable_type' => ProjectExpense::class,
                ]);
                $expenseCount++;
            }
        }
        $this->info("Synced {$expenseCount} old Project Expenses.");

        $vendorPayments = VendorPayment::whereNotNull('account_id')->where('pay_amount', '>', 0)->get();
        $paymentCount = 0;

        foreach ($vendorPayments as $payment) {
            $exists = Transaction::where('transactionable_type', VendorPayment::class)
                ->where('transactionable_id', $payment->id)
                ->exists();

            if (!$exists) {
                Transaction::create([
                    'account_id'           => $payment->account_id,
                    'type'                 => 'debit',
                    'amount'               => $payment->pay_amount,
                    'transaction_date'     => $payment->date,
                    'description'          => 'Vendor Payment (Auto Synced) - VP-' . $payment->id,
                    'reference_number'     => 'VP-' . $payment->id,
                    'transactionable_id'   => $payment->id,
                    'transactionable_type' => VendorPayment::class,
                ]);
                $paymentCount++;
            }
        }
        $this->info("Synced {$paymentCount} old Vendor Payments.");

        $this->info('All missing transactions have been synced successfully!');
    }
}
